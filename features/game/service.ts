import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import { z } from 'zod';
import { mergeLineup } from '@/features/challenges/lineup';
import { previewRevisions } from '@/features/challenges/preview-revisions';
import type { YearRange } from '@/features/challenges/years';
import { importCatalogue } from '@/features/entertainment/catalogue-import';
import { broadCatalogueSearch } from '@/features/entertainment/catalogue-search';
import { maintainSourceQueue } from '@/features/entertainment/maintenance';
import { sourceRangeRounds } from '@/features/entertainment/range-rounds';
import { type SourceCategory, searchSourceTitles } from '@/features/entertainment/source-client';
import { rpc } from '@/lib/database';
import { getSupabase } from '@/lib/supabase/server';
import {
  type CatalogueItem,
  type Category,
  catalogueItemSchema,
  categorySchema,
  challengeSchema,
  completionSchema,
  gameStateSchema,
  type HubData,
  modeSchema,
} from './contracts';
import { GameEngine } from './engine';
import { modeDescriptions, presentState } from './presentation';
export const engine = new GameEngine({
  play: async (playerDigest, challengeKey, selectedSlug) => {
    const result = await rpc('veyli_play', {
      player_digest: playerDigest,
      challenge_key: challengeKey,
      selected_slug: selectedSlug ?? null,
    });
    const parsed = gameStateSchema.safeParse(result);
    if (!parsed.success) return result;
    return presentState(parsed.data);
  },
});
const hubSchema = z.object({
  categories: z.array(categorySchema),
  modes: z.array(modeSchema),
  challenges: z.array(challengeSchema),
});
const loadHub = async (day: string, range?: YearRange): Promise<HubData> => {
  const data = hubSchema.parse(
    await rpc(range ? 'veyli_hub_filtered' : 'veyli_hub', {
      requested_date: day,
      ...(range ? { start_year: range.from, end_year: range.to } : {}),
    })
  );
  const db = process.env.VEYLI_INTEGRATION_DATABASE ? null : getSupabase();
  try {
    if (db) {
      if (range) data.challenges.push(...(await sourceRangeRounds(db, day, range, data)));
      else if (day === new Date().toISOString().slice(0, 10)) {
        const modern = { from: 2000, to: new Date().getUTCFullYear() };
        const currentMovies = await rpc('veyli_hub_filtered', {
          requested_date: day,
          start_year: modern.from,
          end_year: modern.to,
        });
        const filtered = hubSchema.parse(currentMovies);
        data.challenges = mergeLineup(
          await sourceRangeRounds(db, day, modern, filtered, 'movies'),
          data.challenges
        );
      }
    }
  } catch {
    // Existing daily rounds remain available during a source refresh or outage.
  }
  const revisions = await previewRevisions(data.challenges.map((challenge) => challenge.key));
  if (Object.keys(revisions).length)
    data.challenges = data.challenges.filter((challenge) => revisions[challenge.key]);
  return {
    ...data,
    date: day,
    challenges: data.challenges.map((challenge) => ({
      ...challenge,
      mode: {
        ...challenge.mode,
        description: modeDescriptions[challenge.mode.slug] || challenge.mode.description,
      },
      previewUrl: `/api/challenges/${challenge.key}/preview?${revisions[challenge.key] ? `v=${revisions[challenge.key]}&` : ''}rules=5`,
    })),
    available: true,
  };
};
export const hub = async (date?: string, range?: YearRange): Promise<HubData> => {
  maintainSourceQueue();
  const day = date || new Date().toISOString().slice(0, 10);
  try {
    return await (process.env.VEYLI_INTEGRATION_DATABASE ? loadHub : cachedHub)(day, range);
  } catch {
    return { categories: [], modes: [], challenges: [], available: false };
  }
};
const cachedHub = unstable_cache(loadHub, ['veyli-lineup-v1'], {
  revalidate: 60,
  tags: ['veyli-lineup'],
});
const cachedCategories = unstable_cache(
  async () => {
    const db = getSupabase();
    if (!db) throw new Error('Categories unavailable');
    const { data, error } = await db
      .from('veyli_categories')
      .select('slug,name,description,accent,icon,active')
      .order('position');
    if (error || !data) throw new Error('Categories unavailable');
    return z
      .array(categorySchema)
      .parse(data.map((category) => ({ ...category, available: category.active })));
  },
  ['veyli-categories-v1'],
  { revalidate: 60, tags: ['veyli-lineup'] }
);

export const categories = async (): Promise<Category[]> => {
  try {
    return process.env.VEYLI_INTEGRATION_DATABASE
      ? (await hub()).categories
      : await cachedCategories();
  } catch {
    return [];
  }
};
export const invalidateHub = () => {
  expandedSearches.clear();
  if (!process.env.VEYLI_INTEGRATION_DATABASE) revalidateTag('veyli-lineup', { expire: 0 });
};
export const searchCatalogue = async (query: string, category: string, expand = false) => {
  const db = process.env.VEYLI_INTEGRATION_DATABASE ? null : getSupabase();
  const local = db
    ? await broadCatalogueSearch(db, query, category)
    : z
        .array(catalogueItemSchema)
        .parse(await rpc('veyli_search', { query, category_slug: category }));
  const providerConfigured =
    category === 'games' ? process.env.RAWG_API_KEY : process.env.TMDB_API_KEY;
  const more = Boolean(
    local.length < 60 &&
      query.trim().length >= 2 &&
      !process.env.VEYLI_INTEGRATION_DATABASE &&
      ['movies', 'television', 'games'].includes(category) &&
      providerConfigured
  );
  if (!expand || !more) return { items: local, more };
  const key = `${category}:${query.trim().toLowerCase()}`;
  const hit = expandedSearches.get(key);
  if (hit && hit.expires > Date.now()) return hit.work;
  const work = expandCatalogue(db!, query, category as SourceCategory, local);
  if (expandedSearches.size >= 100) expandedSearches.delete(expandedSearches.keys().next().value!);
  expandedSearches.set(key, { expires: Date.now() + 120000, work });
  return work;
};
const expandedSearches = new Map<
  string,
  {
    expires: number;
    work: Promise<{ items: CatalogueItem[]; more: boolean }>;
  }
>();
const expandCatalogue = async (
  db: NonNullable<ReturnType<typeof getSupabase>>,
  query: string,
  category: SourceCategory,
  local: CatalogueItem[]
) => {
  try {
    const titles = await searchSourceTitles(category, query);
    if (!titles.length) return { items: local, more: false };
    await importCatalogue(db, titles);
    return { items: await broadCatalogueSearch(db, query, category), more: false };
  } catch {
    return { items: local, more: false };
  }
};
export const completions = async (playerDigest: string) => {
  return z
    .array(completionSchema)
    .parse(await rpc('veyli_completions', { player_digest: playerDigest }));
};
export const achievementSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  rule: z.object({ metric: z.string(), threshold: z.number().int() }),
});
export const leaderboardSchema = z.array(
  z.object({
    alias: z.string(),
    score: z.number().int(),
    games: z.number().int(),
    wins: z.number().int(),
  })
);
export const rankings = async (date: string) => {
  return leaderboardSchema.parse(await rpc('veyli_leaderboard', { requested_date: date }));
};
