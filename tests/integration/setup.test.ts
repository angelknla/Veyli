import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { seedTestContent } from '../fixtures/seed';
import { callRpc, copyRound, createTestDatabase, platformSql } from '../support/postgres';

it('creates source-only structure and preserves shared objects, content and results on reruns', async () => {
  const db = await createTestDatabase(false);
  try {
    await db.exec(`
      create table public.fitnessjourni_example(id integer primary key, value text);
      insert into public.fitnessjourni_example values(1,'retained');
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      insert into storage.buckets values('fitnessjourni','fitnessjourni',true,123,null);`);
    const setup = await platformSql();
    await db.exec(setup);
    expect(await callRpc(db, 'veyli_hub')).toMatchObject({ challenges: [] });
    for (const table of ['items', 'media', 'challenges', 'clues'])
      expect(
        (await db.query<{ count: number }>(`select count(*)::int count from public.veyli_${table}`))
          .rows[0].count
      ).toBe(0);
    expect(
      (
        await db.query<{ public: boolean }>(
          "select public from storage.buckets where id='veyli-media'"
        )
      ).rows[0].public
    ).toBe(false);
    await seedTestContent(db);
    const day = new Date().toISOString().slice(0, 10);
    const original = `${day}-movies-one-frame`;
    const replacement = `${original}-r2`;
    const player = randomBytes(32).toString('hex');
    await callRpc(db, 'veyli_play', [player, original, 'trip-to-the-moon-1902']);
    await db.query('update public.veyli_challenges set active_revision=false where public_key=$1', [
      original,
    ]);
    const id = await copyRound(db, original, replacement, 'nosferatu-1922', true);
    await callRpc(db, 'veyli_play', [player, replacement, 'nosferatu-1922']);
    await db.query('update public.veyli_clues set crop_percent=75 where challenge_id=$1', [id]);
    const snapshot = async () =>
      (
        await db.query<{ value: unknown }>(
          `
      select jsonb_build_object(
        'content',public.veyli_admin_snapshot(),
        'history',public.veyli_completions($1),
        'board',public.veyli_leaderboard($2),
        'shared',(select jsonb_agg(to_jsonb(x)) from public.fitnessjourni_example x),
        'storage',(select jsonb_agg(to_jsonb(x) order by id) from storage.buckets x)
      ) value`,
          [player, day]
        )
      ).rows[0].value;
    const before = await snapshot();
    await db.exec(setup);
    await db.exec(setup);
    expect(await snapshot()).toEqual(before);
    expect(await callRpc(db, 'veyli_leaderboard', [day])).toEqual([
      expect.objectContaining({ score: 1000, games: 1 }),
    ]);
    expect(await callRpc(db, 'veyli_play', [player, original])).toMatchObject({
      score: 1000,
      answer: { slug: 'trip-to-the-moon-1902' },
    });
  } finally {
    await db.close();
  }
}, 60000);
