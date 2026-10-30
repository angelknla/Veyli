import type { PGlite } from '@electric-sql/pglite';
import { sceneCategories } from '@/features/entertainment/scene-images';
import { aliases, answerFacts, catalogue, frameMedia, sceneMedia } from './catalogue';

/** Small, deterministic test content. This function never connects to Supabase. */
export const seedTestContent = async (db: PGlite) => {
  const categories = (
    await db.query<{ id: string; slug: string }>('select id,slug from public.veyli_categories')
  ).rows;
  const modes = (
    await db.query<{ id: string; slug: string }>('select id,slug from public.veyli_modes')
  ).rows;
  for (const category of categories)
    for (const [slug, title, year] of catalogue[category.slug]) {
      const { rows } = await db.query<{ id: string }>(
        `insert into public.veyli_items(slug,category_id,title,release_year,synopsis,source_url)
         values($1,$2,$3,$4,'Isolated test content','https://en.wikipedia.org/wiki/Test') returning id`,
        [slug, category.id, title, year]
      );
      for (const alias of aliases[slug] || [])
        await db.query('insert into public.veyli_aliases(item_id,title) values($1,$2)', [
          rows[0].id,
          alias,
        ]);
    }
  for (const name of [
    ...Object.values(frameMedia),
    ...Object.values(sceneMedia).flat(),
    'trip-moon-poster',
  ])
    await db.query(
      `insert into public.veyli_media(slug,storage_path,kind,author,license,source_url,approved)
       values($1,$2,'image','Veyli test fixture','CC0','https://example.org/test-image',true)`,
      [name, `admin/test-${name}.jpg`]
    );
  await db.query(`insert into public.veyli_media(slug,kind,quote_text,author,license,source_url,approved)
    values('nosferatu-quote','quote','Your wife? A beautiful woman … with a beautiful neck …',
    'Henrik Galeen; Veyli translation','CC0','https://example.org/test-quote',true)`);

  for (const offset of [-1, 0, 1]) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + offset);
    const date = day.toISOString().slice(0, 10);
    for (const category of categories) {
      const titles = catalogue[category.slug];
      for (const mode of modes) {
        if (!['classic', 'one-frame'].includes(mode.slug) && category.slug !== 'movies') continue;
        // Only categories with sourced scenes carry a Classic round.
        if (mode.slug === 'classic' && !sceneCategories.includes(category.slug)) continue;
        const [answer] = titles[mode.slug === 'one-frame' || mode.slug === 'poster' ? 1 : 0];
        const { rows } = await db.query<{ id: string }>(
          `insert into public.veyli_challenges(public_key,category_id,mode_id,answer_id,release_date,status,attempt_limit,scores)
           values($1,$2,$3,(select id from public.veyli_items where slug=$4),$5,'scheduled',8,'{1000,800,650,500,400,300,200,100}') returning id`,
          [`${date}-${category.slug}-${mode.slug}`, category.id, mode.id, answer, date]
        );
        const round = rows[0].id;
        const scenes =
          mode.slug === 'classic'
            ? sceneMedia[answer]
            : [
                mode.slug === 'poster'
                  ? 'trip-moon-poster'
                  : mode.slug === 'quote'
                    ? 'nosferatu-quote'
                    : frameMedia[answer],
              ];
        // A Classic clue carries its scene and the fact that miss unlocks, in one row.
        const facts = mode.slug === 'classic' ? answerFacts[answer] || [] : [];
        for (const [index, scene] of scenes.entries())
          await db.query(
            `insert into public.veyli_clues(challenge_id,position,kind,media_id,text_content)
             values($1,$2,$3,(select id from public.veyli_media where slug=$4),$5)`,
            [
              round,
              index + 1,
              mode.slug === 'quote' ? 'quote' : 'image',
              scene,
              index > 0 ? (facts[index - 1] ?? null) : null,
            ]
          );
        // Quote adds plain context clues as the round goes on.
        if (mode.slug === 'quote')
          for (const [index, fact] of [
            'Translated from a silent-film intertitle.',
            'A gothic visitor arrives from Transylvania.',
          ].entries())
            await db.query(
              "insert into public.veyli_clues(challenge_id,position,kind,text_content) values($1,$2,'text',$3)",
              [round, index + 2, fact]
            );
        if (mode.slug === 'poster') {
          await db.query(
            "update public.veyli_clues set presentation='blur',blur_amount=30 where challenge_id=$1",
            [round]
          );
          for (const [index, blur] of [24, 18, 12, 8, 4, 2, 0].entries())
            await db.query(
              `insert into public.veyli_clues(challenge_id,position,kind,media_id,presentation,blur_amount)
              values($1,$2,'image',(select id from public.veyli_media where slug=$3),'blur',$4)`,
              [round, index + 2, scenes[0], blur]
            );
        }
      }
    }
  }
};
