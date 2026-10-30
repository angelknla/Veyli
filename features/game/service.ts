import 'server-only';
import { z } from 'zod';
import { mergeLineup } from '@/features/challenges/lineup';
import { previewRevisions } from '@/features/challenges/preview-revisions';
import type { YearRange } from '@/features/challenges/years';
import { importCatalogue } from '@/features/entertainment/catalogue-import';
import {
  broadCatalogueSearch,
  invalidateCatalogue,
} from '@/features/entertainment/catalogue-search';
import { maintainSourceQueue } from '@/features/entertainment/maintenance';
import { sourceRangeRounds } from '@/features/entertainment/range-rounds';
import { type SourceCategory, searchSourceTitles } from '@/features/entertainment/source-client';
import { rpc } from '@/lib/database';
import { getSupabase } from '@/lib/supabase/server';
import {
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
export async function hub(date?: string, range?: YearRange): Promise<HubData> {
  maintainSourceQueue();
  try {
    const data = hubSchema.parse(
      await rpc(range ? 'veyli_hub_filtered' : 'veyli_hub', {
        requested_date: date ?? null,
        ...(range ? { start_year: range.from, end_year: range.to } : {}),
      })
    );
    const db = process.env.VEYLI_INTEGRATION_DATABASE ? null : getSupabase();
    const day = date || new Date().toISOString().slice(0, 10);
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
      date: date || new Date().toISOString().slice(0, 10),
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
  } catch {
    return { categories: [], modes: [], challenges: [], available: false };
  }
}
export async function searchCatalogue(query: string, category: string) {
  const db = process.env.VEYLI_INTEGRATION_DATABASE ? null : getSupabase();
  const local = db
    ? await broadCatalogueSearch(db, query, category)
    : z
        .array(catalogueItemSchema)
        .parse(await rpc('veyli_search', { query, category_slug: category }));
  if (
    local.length >= 60 ||
    query.trim().length < 2 ||
    process.env.VEYLI_INTEGRATION_DATABASE ||
    !['movies', 'television', 'games'].includes(category)
  )
    return local;
  try {
    const titles = await searchSourceTitles(category as SourceCategory, query);
    if (!db || !titles.length) return local;
    await importCatalogue(db, titles);
    invalidateCatalogue(category);
    return await broadCatalogueSearch(db, query, category);
  } catch {
    return local;
  }
}
export async function completions(playerDigest: string) {
  return z
    .array(completionSchema)
    .parse(await rpc('veyli_completions', { player_digest: playerDigest }));
}
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
export async function rankings(date: string) {
  return leaderboardSchema.parse(await rpc('veyli_leaderboard', { requested_date: date }));
}
