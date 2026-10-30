import 'server-only';

import { z } from 'zod';
import { availableRangeRound, isRangeRound } from '@/features/entertainment/range-rounds';
import { clueImageOptions } from '@/features/game/presentation';
import { rpc } from '@/lib/database';
import { isTestDatabaseEnabled } from '@/lib/environment';
import { getSupabase } from '@/lib/supabase/server';

const previewSchema = z.object({
  blur_amount: z.number(),
  crop_percent: z.number(),
  media: z.object({ storage_path: z.string(), approved: z.literal(true) }),
});
const presentPreview = (value: unknown, mode: string, category: string) => {
  if (!value) return null;
  const image = previewSchema.parse(value);
  const options = clueImageOptions(
    { mode, category, attemptsUsed: 0, attemptLimit: 8 },
    { blur: image.blur_amount, cropPercent: image.crop_percent }
  );
  return {
    ...image,
    blur_amount: options.blur,
    crop_percent: options.cropPercent,
    coverPercent: options.coverPercent,
  };
};
/** Only an available round's first image. Never opens a player session. */
export const initialImage = async (key: string) => {
  if (isTestDatabaseEnabled()) {
    const { embeddedInitialImage } = await import('@/tests/support/database');
    const value = await embeddedInitialImage(key);
    return value ? presentPreview(value, value.mode, value.category) : null;
  }
  const db = getSupabase();
  if (!db) return null;
  const { data: challenge, error } = await db
    .from('veyli_challenges')
    .select('id,release_date,mode:veyli_modes(slug),category:veyli_categories(slug)')
    .eq('public_key', key)
    .maybeSingle();
  if (error || !challenge) return null;
  const mode = z.object({ slug: z.string() }).parse(challenge.mode).slug;
  const category = z.object({ slug: z.string() }).parse(challenge.category).slug;
  const available = z
    .object({ challenges: z.array(z.object({ key: z.string() })) })
    .parse(await rpc('veyli_hub', { requested_date: challenge.release_date }));
  if (
    !available.challenges.some((value) => value.key === key) &&
    !(isRangeRound(key) && (await availableRangeRound(db, key)))
  )
    return null;
  const { data } = await db
    .from('veyli_clues')
    .select('blur_amount,crop_percent,media:veyli_media!inner(storage_path,approved)')
    .eq('challenge_id', challenge.id)
    .eq('position', 1)
    .eq('kind', 'image')
    .maybeSingle();
  return presentPreview(data, mode, category);
};
