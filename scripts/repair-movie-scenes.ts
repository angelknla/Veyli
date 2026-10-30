import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { importImage } from '../features/entertainment/media-import';
import { reviewedMovieScene, withReviewedMovieScene } from '../features/entertainment/scene-images';
import type { SourceTitle } from '../features/entertainment/source-client';

const main = async () => {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('Supabase configuration missing');
  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const today = new Date().toISOString().slice(0, 10);
  const items = await db
    .from('veyli_items')
    .select('id,provenance,category:veyli_categories!inner(slug)')
    .eq('category.slug', 'movies')
    .eq('active', true);
  const rounds = await db
    .from('veyli_challenges')
    .select(
      'id,public_key,answer_id,attempt_limit,scores,category:veyli_categories!inner(slug),mode:veyli_modes!inner(slug),clues:veyli_clues(id,position,media_id)'
    )
    .eq('category.slug', 'movies')
    .in('mode.slug', ['classic', 'one-frame'])
    .gte('release_date', today)
    .order('id');
  if (items.error || rounds.error || !items.data || !rounds.data)
    throw new Error('Movie scene lookup failed');
  const profiles = items.data.filter(
    (item) => item.provenance?.source && reviewedMovieScene(item.provenance.source)
  );
  await writeFile(
    '/tmp/veyli-scene-repair-backup.json',
    JSON.stringify({ items: profiles, rounds: rounds.data }, null, 2)
  );
  let updated = 0;
  let registered = 0;
  for (const item of profiles) {
    const source = item.provenance.source as SourceTitle;
    const scene = reviewedMovieScene(source)!;
    const references = rounds.data.filter((round) => round.answer_id === item.id);
    if (references.length) {
      const media = await importImage(db, scene);
      if (!media) throw new Error('Reviewed scene unavailable');
      registered++;
      for (const round of references) {
        const clue = round.clues.find((clue) => clue.position === 1);
        if (!clue || clue.media_id === media) continue;
        const saved = await db
          .from('veyli_clues')
          .update({ media_id: media })
          .eq('id', clue.id)
          .eq('media_id', clue.media_id)
          .select('id');
        if (saved.error) throw new Error('Movie scene update failed');
        updated += saved.data.length;
      }
    }
    const saved = await db
      .from('veyli_items')
      .update({
        provenance: {
          ...item.provenance,
          source: withReviewedMovieScene(source),
          sceneReviewedAt: new Date().toISOString(),
        },
      })
      .eq('id', item.id);
    if (saved.error) throw new Error('Scene metadata update failed');
    console.log(
      `Reviewed scene applied: ${registered} media assets; ${updated} current/upcoming frames corrected`
    );
  }
  const after = await db
    .from('veyli_challenges')
    .select('id,answer_id,attempt_limit,scores')
    .in(
      'id',
      rounds.data.map((round) => round.id)
    );
  if (after.error || !after.data) throw new Error('Round verification failed');
  for (const row of after.data) {
    const prior = rounds.data.find((round) => round.id === row.id)!;
    if (
      row.answer_id !== prior.answer_id ||
      row.attempt_limit !== prior.attempt_limit ||
      JSON.stringify(row.scores) !== JSON.stringify(prior.scores)
    )
      throw new Error('Round rules changed unexpectedly');
  }
  console.log(
    `${profiles.length} movie profiles reviewed; ${updated} frames corrected; answers and scoring unchanged`
  );
};
main().catch(() => {
  console.error('Movie scene repair failed; existing answers and results are retained.');
  process.exitCode = 1;
});
