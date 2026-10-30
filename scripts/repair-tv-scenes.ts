import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { importCatalogue } from '../features/entertainment/catalogue-import';
import { importImage } from '../features/entertainment/media-import';
import {
  type SourceTitle,
  searchSourceTitles,
  televisionScene,
} from '../features/entertainment/source-client';

async function main() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('Supabase configuration missing');
  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const today = new Date().toISOString().slice(0, 10);
  const rounds = await db
    .from('veyli_challenges')
    .select(
      'id,public_key,answer_id,attempt_limit,scores,answer:veyli_items(id,title,release_year,provenance),category:veyli_categories!inner(slug),mode:veyli_modes!inner(slug),clues:veyli_clues(id,position,media_id)'
    )
    .eq('category.slug', 'television')
    .in('mode.slug', ['classic', 'one-frame'])
    .gte('release_date', today)
    .order('id');
  if (rounds.error || !rounds.data) throw new Error('TV round lookup failed');
  for (const row of rounds.data) {
    const answer = row.answer as unknown as {
      id: string;
      title: string;
      release_year: number;
      provenance: { source?: SourceTitle };
    };
    if (answer.provenance?.source) continue;
    const matches = await searchSourceTitles('television', answer.title);
    const match = matches.find(
      (item) =>
        item.title.toLowerCase() === answer.title.toLowerCase() && item.year === answer.release_year
    );
    if (match) await importCatalogue(db, [match]);
  }
  const items = await db
    .from('veyli_items')
    .select('id,title,provenance,category:veyli_categories!inner(slug)')
    .eq('category.slug', 'television')
    .eq('active', true);
  if (items.error || !items.data) throw new Error('TV catalogue lookup failed');
  const profiles = items.data.filter(
    (item) =>
      item.provenance?.source?.provider === 'tmdb' &&
      (item.provenance.source.images?.length ||
        rounds.data.some((round) => round.answer_id === item.id))
  );
  await writeFile(
    '/tmp/veyli-tv-scene-repair-backup.json',
    JSON.stringify({ items: profiles, rounds: rounds.data }, null, 2)
  );
  let updated = 0;
  let scenes = 0;
  const available: { title: string; source: SourceTitle }[] = [];
  const missing: string[] = [];
  for (const item of profiles) {
    const source = item.provenance.source as SourceTitle;
    const scene = await televisionScene(source);
    if (!scene) {
      missing.push(item.title);
      continue;
    }
    const references = rounds.data.filter((round) => round.answer_id === item.id);
    const media = await importImage(db, scene);
    if (!media) throw new Error('TV episode scene unavailable');
    for (const round of references) {
      const clue = round.clues.find((clue) => clue.position === 1);
      if (!clue || clue.media_id === media) continue;
      const saved = await db
        .from('veyli_clues')
        .update({ media_id: media })
        .eq('id', clue.id)
        .eq('media_id', clue.media_id)
        .select('id');
      if (saved.error) throw new Error('TV scene update failed');
      updated += saved.data.length;
    }
    const corrected: SourceTitle = {
      ...source,
      images: [scene, ...source.images.filter((image) => image.role === 'poster')],
    };
    const saved = await db
      .from('veyli_items')
      .update({
        provenance: {
          ...item.provenance,
          source: corrected,
          sceneReviewedAt: new Date().toISOString(),
        },
      })
      .eq('id', item.id);
    if (saved.error) throw new Error('TV scene metadata update failed');
    available.push({ title: item.title, source: corrected });
    scenes++;
    console.log(
      `${scenes} episode stills available; ${updated} current/upcoming TV frames corrected`
    );
  }
  await writeFile('/tmp/veyli-tv-episode-scenes.json', JSON.stringify(available, null, 2));
  const after = await db
    .from('veyli_challenges')
    .select('id,answer_id,attempt_limit,scores')
    .in(
      'id',
      rounds.data.map((round) => round.id)
    );
  if (after.error || !after.data) throw new Error('TV round verification failed');
  for (const row of after.data) {
    const original = rounds.data.find((round) => round.id === row.id)!;
    if (
      row.answer_id !== original.answer_id ||
      row.attempt_limit !== original.attempt_limit ||
      JSON.stringify(row.scores) !== JSON.stringify(original.scores)
    )
      throw new Error('TV rules changed unexpectedly');
  }
  console.log(
    `${scenes} TV shows have aired episode stills; ${updated} frames corrected; answers/scoring unchanged; ${missing.length} source gaps`
  );
  if (missing.length) console.log('Unavailable episode stills:', missing.join(', '));
}
main().catch(() => {
  console.error('TV scene repair failed; existing answers and player results retained.');
  process.exitCode = 1;
});
