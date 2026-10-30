import type { SupabaseClient } from '@supabase/supabase-js';
import { after } from 'next/server';
import type { CatalogueItem } from '../game/contracts';

type SearchItem = CatalogueItem & { aliases: string[] };
const catalogue = new Map<string, { expires: number; items: SearchItem[] }>();
const pending = new Map<string, Promise<SearchItem[]>>();
const versions = new Map<string, number>();
export const invalidateCatalogue = (category?: string) => {
  if (!category) {
    for (const key of new Set([...catalogue.keys(), ...pending.keys()])) invalidateCatalogue(key);
    return;
  }
  versions.set(category, (versions.get(category) || 0) + 1);
  catalogue.delete(category);
  pending.delete(category);
};
export const normalizeTitle = (value: string) => {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};
export const matchCatalogue = (items: SearchItem[], query: string, limit = 60): CatalogueItem[] => {
  const needle = normalizeTitle(query);
  if (!needle) return [];
  return items
    .flatMap((item) => {
      const names = [item.title, ...item.aliases].map(normalizeTitle);
      const matches = names.filter((name) => name.includes(needle));
      if (!matches.length) return [];
      const rank = Math.min(
        ...matches.map((name) => (name === needle ? 0 : name.startsWith(needle) ? 1 : 2))
      );
      return [{ item, rank }];
    })
    .sort(
      (a, b) =>
        a.rank - b.rank || a.item.title.localeCompare(b.item.title) || b.item.year - a.item.year
    )
    .slice(0, limit)
    .map(({ item: { aliases: _aliases, ...item } }) => item);
};
export const broadCatalogueSearch = async (db: SupabaseClient, query: string, category: string) => {
  const hit = catalogue.get(category);
  if (hit) {
    if (hit.expires <= Date.now())
      after(async () => {
        await refreshCatalogue(db, category).catch(() => {});
      });
    return matchCatalogue(hit.items, query);
  }
  return matchCatalogue(await refreshCatalogue(db, category), query);
};
const refreshCatalogue = (db: SupabaseClient, category: string) => {
  let work = pending.get(category);
  if (!work) {
    const version = versions.get(category) || 0;
    work = (async () => {
      const items: SearchItem[] = [];
      for (let offset = 0; ; offset += 1000) {
        const result = await db
          .from('veyli_items')
          .select(
            'slug,title,release_year,category:veyli_categories!inner(slug,active),aliases:veyli_aliases(title)'
          )
          .eq('active', true)
          .eq('category.active', true)
          .eq('category.slug', category)
          .order('id')
          .range(offset, offset + 999);
        if (result.error || !result.data) throw new Error('Catalogue unavailable');
        for (const row of result.data)
          items.push({
            slug: row.slug,
            title: row.title,
            year: row.release_year,
            category,
            aliases: row.aliases.map((alias) => alias.title),
          });
        if (result.data.length < 1000) break;
      }
      if (version === (versions.get(category) || 0))
        catalogue.set(category, { expires: Date.now() + 300000, items });
      return items;
    })().finally(() => {
      if (pending.get(category) === work) pending.delete(category);
    });
    pending.set(category, work);
  }
  return work;
};
