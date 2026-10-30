import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { seedTestContent } from '../fixtures/seed';

export const platformSql = () => readFile('supabase/setup.sql', 'utf8');

export async function createTestDatabase(seed = true) {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(await platformSql());
  if (seed) await seedTestContent(db);
  return db;
}

export async function callRpc<T = unknown>(
  db: PGlite,
  name: string,
  values: unknown[] = []
): Promise<T> {
  const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
  const result = await db.query<{ value: T }>(
    `select public.${name}(${placeholders}) value`,
    values
  );
  return result.rows[0].value;
}

export async function copyRound(
  db: PGlite,
  original: string,
  key: string,
  answer: string,
  active = false
) {
  const { rows } = await db.query<{ id: string }>(
    `
    insert into public.veyli_challenges(public_key,category_id,mode_id,answer_id,release_date,status,attempt_limit,scores,active_revision)
    select $1,category_id,mode_id,(select id from public.veyli_items where slug=$2),release_date,status,attempt_limit,scores,$3
    from public.veyli_challenges where public_key=$4 returning id
  `,
    [key, answer, active, original]
  );
  const id = rows[0].id;
  await db.query(
    `insert into public.veyli_clues(challenge_id,position,kind,media_id)
    select $1,1,'image',media_id from public.veyli_clues where challenge_id=(select id from public.veyli_challenges where public_key=$2) and position=1`,
    [id, original]
  );
  return id;
}
