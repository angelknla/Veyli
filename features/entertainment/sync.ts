import type { SupabaseClient } from '@supabase/supabase-js';
import { challengeInput } from '../admin/contracts';
import { importCatalogue, sourceSlug } from './catalogue-import';
import { imageUseAllowed, importImage } from './media-import';
import { classicScenes, minimumScenes, sourceModeImages } from './scene-images';
import { clueSignature, dailyModes, orderedPool, sourceClues } from './schedule';
import {
  discoverScreenTitles,
  hydrateScreenTitle,
  type SourceCategory,
  type SourceImage,
  type SourceTitle,
} from './source-client';
import { discoverWikimedia, hydrateWikimediaTitle, sourceCategories } from './wikimedia';

export type SyncOptions = {
  cachedOnly?: boolean;
  categories?: SourceCategory[];
  pages?: number;
  poolSize?: number;
  days?: number;
  catalogueOnly?: boolean;
  log?: (message: string) => void;
};
export type SyncReport = {
  catalogue: number;
  images: number;
  scheduled: number;
  preserved: number;
  categories: Record<string, number>;
  unavailable: string[];
};
let currentSync: Promise<SyncReport> | null = null;
export const syncSources = (db: SupabaseClient, options: SyncOptions = {}) => {
  if (currentSync) return currentSync;
  currentSync = runSync(db, options).finally(() => {
    currentSync = null;
  });
  return currentSync;
};
const runSync = async (db: SupabaseClient, options: SyncOptions): Promise<SyncReport> => {
  const log = options.log || (() => {});
  const report: SyncReport = {
    catalogue: 0,
    images: 0,
    scheduled: 0,
    preserved: 0,
    categories: {},
    unavailable: [],
  };
  const all: SourceTitle[] = [];
  const pools = new Map<SourceCategory, SourceTitle[]>();
  const year = new Date().getUTCFullYear();
  const bucket = await db.storage.getBucket('veyli-media');
  if (bucket.error || bucket.data.public) throw new Error('Veyli needs its private media bucket');
  for (const category of options.cachedOnly ? [] : options.categories || sourceCategories) {
    try {
      let found: SourceTitle[] = [];
      if (category === 'music' || category === 'pop-culture')
        found = await discoverWikimedia(category, options.poolSize || 60);
      else {
        for (const [from, to] of [
          [1900, 1999],
          [2000, year],
        ])
          for (let page = 1; page <= (options.pages || 3); page++)
            found.push(...(await discoverScreenTitles(category, page, from, to)));
      }
      found = [...new Map(found.map((item) => [sourceSlug(item), item])).values()];
      all.push(...found);
      log(`${category}: ${found.length} source titles discovered`);
      const hydrated: SourceTitle[] = [];
      if (!options.catalogueOnly) {
        for (const item of orderedPool(found).slice(0, options.poolSize || 60)) {
          try {
            const value =
              category === 'music' || category === 'pop-culture'
                ? await hydrateWikimediaTitle(item)
                : await hydrateScreenTitle(item);
            if (value.images.some((image) => imageUseAllowed(image)) && value.facts.length >= 2)
              hydrated.push(value);
          } catch {
            /* An unavailable title never stops other titles/categories from importing. */
          }
        }
      }
      pools.set(category, hydrated);
      report.categories[category] = hydrated.length;
      log(`${category}: ${hydrated.length} titles ready for visual puzzles`);
    } catch {
      report.unavailable.push(category);
      log(`${category}: source unavailable; existing puzzles retained`);
    }
  }
  const imported = await importCatalogue(db, all, !options.catalogueOnly);
  report.catalogue = imported.size;
  log(`${report.catalogue} catalogue titles synchronised`);
  if (options.catalogueOnly) return report;
  // Retain previous source pools as discovery adds titles over time.
  for (let offset = 0; ; offset += 1000) {
    const stored = await db
      .from('veyli_items')
      .select('id,slug,provenance')
      .eq('active', true)
      .order('id')
      .range(offset, offset + 999);
    if (stored.error || !stored.data) throw new Error('Cached source catalogue unavailable');
    for (const row of stored.data) {
      const item = row.provenance?.source as SourceTitle | undefined;
      if (item?.images?.some((image) => imageUseAllowed(image)) && item.facts?.length >= 2) {
        const pool = pools.get(item.category) || [];
        if (!pool.some((value) => sourceSlug(value) === sourceSlug(item))) pool.push(item);
        pools.set(item.category, pool);
        if (!imported.has(sourceSlug(item)))
          imported.set(sourceSlug(item), { id: row.id, slug: row.slug, active: true });
      }
    }
    if (stored.data.length < 1000) break;
  }
  for (const category of sourceCategories)
    report.categories[category] = pools.get(category)?.length || 0;
  const categories = await db.from('veyli_categories').select('id,slug');
  const modes = await db.from('veyli_modes').select('id,slug');
  if (categories.error || modes.error || !categories.data || !modes.data)
    throw new Error('Veyli rules unavailable');
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + (options.days ?? 30) * 86400000).toISOString().slice(0, 10);
  const existing = await db
    .from('veyli_challenges')
    .select(
      'id,category_id,mode_id,release_date,answer_id,status,attempt_limit,scores,clues:veyli_clues(position,kind,media_id,text_content,presentation,blur_amount,crop_percent)'
    )
    .eq('active_revision', true)
    .gte('release_date', today)
    .lte('release_date', end);
  if (existing.error || !existing.data) throw new Error('Veyli schedule unavailable');
  const locked = new Set<string>();
  for (let offset = 0; offset < existing.data.length; offset += 100) {
    const played = await db
      .from('veyli_sessions')
      .select('challenge_id')
      .in(
        'challenge_id',
        existing.data.slice(offset, offset + 100).map((row) => row.id)
      );
    if (played.error || !played.data) throw new Error('Veyli progress unavailable');
    for (const row of played.data) locked.add(row.challenge_id);
  }
  const mediaCache = new Map<string, string | null>();
  const importAsset = async (image: SourceImage) => {
    if (!imageUseAllowed(image)) return null;
    if (mediaCache.has(image.url)) return mediaCache.get(image.url)!;
    try {
      const id = await importImage(db, image);
      mediaCache.set(image.url, id);
      if (id) report.images++;
      return id;
    } catch {
      mediaCache.set(image.url, null);
      return null;
    }
  };
  /** Classic needs its whole run of scenes; a short run leaves the day without the mode. */
  const importAssets = async (item: SourceTitle, mode: string) => {
    const images = mode === 'classic' ? classicScenes(item) : sourceModeImages(item, mode);
    const assets: string[] = [];
    for (const image of images) {
      const id = await importAsset(image);
      if (id) assets.push(id);
    }
    return mode === 'classic' && assets.length < minimumScenes ? [] : assets;
  };
  for (let offset = 0; offset <= (options.days ?? 30); offset++) {
    const day = new Date(`${today}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() + offset);
    const date = day.toISOString().slice(0, 10);
    for (const category of options.categories || sourceCategories) {
      const categoryRow = categories.data.find((row) => row.slug === category);
      const pool = (pools.get(category) || []).filter(
        (item) => imported.get(sourceSlug(item))?.active
      );
      const picks = dailyModes(pool, date, category);
      if (!categoryRow || !picks.length) continue;
      for (const { mode: name, item } of picks) {
        const mode = modes.data.find((row) => row.slug === name);
        if (!mode) continue;
        const current = existing.data.find(
          (row) =>
            row.category_id === categoryRow.id &&
            row.mode_id === mode.id &&
            row.release_date === date
        );
        // Today's shared daily answers and all opened/results/history are stable.
        if (current && (offset === 0 || locked.has(current.id) || current.status === 'draft')) {
          report.preserved++;
          continue;
        }
        const answer = imported.get(sourceSlug(item));
        if (!answer) continue;
        const assets = await importAssets(item, name);
        if (!assets.length) continue;
        const payload = challengeInput.parse({
          ...(current ? { id: current.id } : {}),
          category_id: categoryRow.id,
          mode_id: mode.id,
          answer_id: answer.id,
          accepted_answer_ids: [],
          release_date: date,
          status: 'scheduled',
          difficulty: 'medium',
          attempt_limit: 8,
          scores: [1000, 800, 650, 500, 400, 300, 200, 100],
          clues: sourceClues(name, assets, item.facts),
        });
        if (
          current?.answer_id === answer.id &&
          current.attempt_limit === payload.attempt_limit &&
          JSON.stringify(current.scores) === JSON.stringify(payload.scores) &&
          clueSignature(current.clues) === clueSignature(payload.clues)
        )
          continue;
        const saved = await db.rpc('veyli_admin_save', { entity: 'challenge', payload });
        if (saved.error) {
          // SQL rechecks immutability, including sessions started during a sync.
          report.preserved++;
          continue;
        }
        report.scheduled++;
      }
    }
  }
  log(
    `${report.images} images available; ${report.scheduled} source rounds scheduled; ${report.preserved} existing rounds preserved`
  );
  return report;
};
