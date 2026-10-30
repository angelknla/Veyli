import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { seedTestContent } from '../fixtures/seed';

const shared = globalThis as typeof globalThis & { veyliIntegrationDatabase?: Promise<PGlite> };
async function database() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL)
    throw new Error('integration_database_disabled');
  if (!shared.veyliIntegrationDatabase)
    shared.veyliIntegrationDatabase = (async () => {
      const db = new PGlite(process.env.VEYLI_INTEGRATION_DATABASE);
      await db.waitReady;
      const check = await db.query<{ exists: boolean }>(
        "select exists(select 1 from pg_tables where tablename='veyli_categories')"
      );
      if (!check.rows[0].exists) {
        await db.exec(
          'create role anon; create role authenticated; create role service_role bypassrls;'
        );
        await db.exec(await readFile('supabase/setup.sql', 'utf8'));
        await seedTestContent(db);
      }
      return db;
    })();
  return shared.veyliIntegrationDatabase;
}
export async function embeddedRpc(name: string, parameters: Record<string, unknown>) {
  const db = await database();
  const entries = Object.entries(parameters);
  if (!entries.every(([key]) => /^[a-z_]+$/.test(key))) throw new Error('invalid_parameter');
  const argumentsSql = entries.map(([key], index) => `${key} => $${index + 1}`).join(',');
  const result = await db.query<{ value: unknown }>(
    `select public.${name}(${argumentsSql}) as value`,
    entries.map(([, value]) => value)
  );
  return result.rows[0]?.value ?? null;
}
export async function embeddedLifecycle(id: string, status: string) {
  const db = await database();
  await db.query('update public.veyli_challenges set status=$1 where id=$2', [status, id]);
}
export async function embeddedReferences(id: string, kind: 'item' | 'media') {
  const db = await database();
  const result = await db.query<{ exists: boolean }>(
    kind === 'item'
      ? 'select exists(select 1 from public.veyli_challenges where answer_id=$1 or $1=any(accepted_answer_ids))'
      : 'select exists(select 1 from public.veyli_clues cl join public.veyli_sessions s on s.challenge_id=cl.challenge_id where cl.media_id=$1)',
    [id]
  );
  return result.rows[0].exists;
}

export async function embeddedInitialImage(key: string) {
  const db = await database();
  const result = await db.query<{
    blur_amount: number;
    crop_percent: number;
    mode: string;
    category: string;
    media: unknown;
  }>(
    `select cl.blur_amount,cl.crop_percent,mode.slug mode,cat.slug category,jsonb_build_object('storage_path',m.storage_path,'approved',m.approved) media
     from public.veyli_challenges c join public.veyli_clues cl on cl.challenge_id=c.id
     join public.veyli_media m on m.id=cl.media_id
     join public.veyli_modes mode on mode.id=c.mode_id
     join public.veyli_categories cat on cat.id=c.category_id
     where c.public_key=$1 and public.veyli_available(c) and cl.position=1 and cl.kind='image'`,
    [key]
  );
  return result.rows[0] ?? null;
}

export async function embeddedPreviewRevisions(keys: string[]) {
  const db = await database();
  const result = await db.query<{ public_key: string; clues: unknown[] }>(
    `select c.public_key, jsonb_agg(jsonb_build_object(
      'id',cl.id,'position',cl.position,'media_id',cl.media_id,'blur_amount',cl.blur_amount,
      'crop_percent',cl.crop_percent,'media',jsonb_build_object('storage_path',m.storage_path))) clues
     from public.veyli_challenges c join public.veyli_clues cl on cl.challenge_id=c.id and cl.position=1
     left join public.veyli_media m on m.id=cl.media_id
     join public.veyli_modes mode on mode.id=c.mode_id
     where c.active_revision and c.public_key=any($1) group by c.public_key`,
    [keys]
  );
  return result.rows;
}
