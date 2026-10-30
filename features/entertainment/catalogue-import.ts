import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { itemInput } from '../admin/contracts';
import type { SourceTitle } from './source-client';

type ItemRow = {
  id: string;
  slug: string;
  category_id: string;
  title: string;
  release_year: number;
  synopsis: string;
  source_url: string;
  provenance: Record<string, unknown>;
  active: boolean;
};
export function titleIdentity(title: string, year: number, category: string) {
  return `${category}:${year}:${title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')}`;
}
export function sourceSlug(item: SourceTitle) {
  return `source-${item.category}-${item.provider}-${item.providerId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
}
/** Retains existing IDs and editorial fields; source identity makes repeated imports idempotent. */
export async function importCatalogue(db: SupabaseClient, titles: SourceTitle[], batch = false) {
  const categories = await db.from('veyli_categories').select('id,slug');
  if (categories.error || !categories.data) throw new Error('Veyli categories unavailable');
  const ids = new Map(categories.data.map((x) => [x.slug, x.id as string]));
  const rows: ItemRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await db
      .from('veyli_items')
      .select('*')
      .order('id')
      .range(offset, offset + 999);
    if (page.error || !page.data) throw new Error('Veyli catalogue unavailable');
    rows.push(...(page.data as ItemRow[]));
    if (page.data.length < 1000) break;
  }
  const byIdentity = new Map(
    rows.map((row) => [titleIdentity(row.title, row.release_year, row.category_id), row])
  );
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const imported = new Map<string, { id: string; slug: string; active: boolean }>();
  const payloads: ItemRow[] = [];
  const aliases: { item_id: string; title: string }[] = [];
  for (const item of titles) {
    const categoryId = ids.get(item.category);
    if (!categoryId) continue;
    const slug = sourceSlug(item);
    const identity = titleIdentity(item.title, item.year, categoryId);
    const existing =
      bySlug.get(slug) ||
      byIdentity.get(identity) ||
      (item.category === 'music'
        ? rows.find(
            (row) =>
              row.category_id === categoryId &&
              !row.slug.startsWith('source-') &&
              row.title.toLowerCase() === item.title.toLowerCase()
          )
        : undefined);
    const record = existing
      ? {
          ...existing,
          release_year: existing.slug.startsWith('source-') ? item.year : existing.release_year,
        }
      : {
          id: randomUUID(),
          slug,
          category_id: categoryId,
          title: item.title,
          release_year: item.year,
          synopsis: '',
          source_url: item.sourceUrl,
          provenance: {},
          active: true,
        };
    const previous = record.provenance.source as SourceTitle | undefined;
    const source = {
      ...previous,
      ...item,
      facts: item.facts.length ? item.facts : previous?.facts || [],
      images: item.images.length ? item.images : previous?.images || [],
    };
    const parsed = itemInput.parse({
      ...record,
      provenance: {
        ...record.provenance,
        source,
        importedAt: new Date().toISOString(),
        ...(batch ? { batchImportedAt: new Date().toISOString() } : {}),
      },
    });
    const { aliases: _aliases, ...payload } = parsed;
    payloads.push(payload as ItemRow);
    for (const alias of new Set(item.aliases.filter((x) => x.trim() && x.length <= 200)))
      aliases.push({ item_id: record.id, title: alias });
    imported.set(slug, { id: record.id, slug: record.slug, active: record.active });
    byIdentity.set(identity, record);
    bySlug.set(slug, record);
  }
  // Concurrent searches can import the same new source slug. The database chooses the winning ID.
  const unique = [...new Map(payloads.map((row) => [row.slug, row])).values()];
  if (!unique.length) return imported;
  for (let offset = 0; offset < unique.length; offset += 100) {
    const result = await db
      .from('veyli_items')
      .upsert(unique.slice(offset, offset + 100), { onConflict: 'slug', ignoreDuplicates: true })
      .select('id,slug,active');
    if (result.error) throw new Error('Source catalogue save failed');
  }
  // Preserve editorial fields/results; refresh provider dates only for generated source entries.
  for (const row of unique.filter((row) => rows.some((existing) => existing.id === row.id))) {
    const result = await db
      .from('veyli_items')
      .update({
        provenance: row.provenance,
        ...(row.slug.startsWith('source-') ? { release_year: row.release_year } : {}),
      })
      .eq('id', row.id);
    if (result.error) throw new Error('Source metadata save failed');
  }
  const actual = new Map<string, { id: string; slug: string; active: boolean }>();
  for (let offset = 0; offset < unique.length; offset += 100) {
    const saved = await db
      .from('veyli_items')
      .select('id,slug,active')
      .in(
        'slug',
        unique.slice(offset, offset + 100).map((row) => row.slug)
      );
    if (saved.error || !saved.data) throw new Error('Imported catalogue lookup failed');
    for (const row of saved.data) actual.set(row.slug, row);
  }
  const correctedAliases = aliases.map((alias) => {
    const row = payloads.find((item) => item.id === alias.item_id);
    return { ...alias, item_id: (row && actual.get(row.slug)?.id) || alias.item_id };
  });
  if (correctedAliases.length) {
    const result = await db
      .from('veyli_aliases')
      .upsert(
        [...new Map(correctedAliases.map((row) => [`${row.item_id}:${row.title}`, row])).values()],
        { onConflict: 'item_id,title', ignoreDuplicates: true }
      );
    if (result.error) throw new Error('Source aliases save failed');
  }
  for (const [key, value] of imported) {
    const row = actual.get(value.slug);
    if (row) imported.set(key, { id: row.id, slug: row.slug, active: row.active });
  }
  return imported;
}
