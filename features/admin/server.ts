import 'server-only';
import { headers } from 'next/headers';
import { rpc, ServiceError } from '@/lib/database';
import { isTestDatabaseEnabled } from '@/lib/environment';
import { verifyAdminHeader } from '@/lib/security/token';
import { getSupabase } from '@/lib/supabase/server';
import type { AdminRecord, AdminSnapshot, Entity } from './contracts';
export async function requireAdmin() {
  if (!verifyAdminHeader((await headers()).get('authorization'), process.env.ADMIN_ACCESS_KEY))
    throw new ServiceError('admin_access_required', 401);
}
export async function adminSnapshot() {
  await requireAdmin();
  return (await rpc('veyli_admin_snapshot')) as AdminSnapshot;
}

/** Changing referenced answers or images would invalidate existing player results. */
export async function protectReferencedContent(entity: Entity, payload: AdminRecord) {
  const item = entity === 'item' && 'category_id' in payload;
  const media = entity === 'media' && 'storage_path' in payload;
  if (!payload.id || (!item && !media)) return;
  const snapshot = await adminSnapshot();
  const existing = (item ? snapshot.items : snapshot.media).find(
    (record) => record.id === payload.id
  );
  if (!existing) return;
  const fields = item ? ['category_id'] : ['storage_path', 'quote_text', 'kind'];
  if (fields.every((field) => existing[field] === payload[field])) return;

  let referenced: boolean;
  const id = String(payload.id);
  if (isTestDatabaseEnabled()) {
    const { embeddedReferences } = await import('@/tests/support/database');
    referenced = await embeddedReferences(id, item ? 'item' : 'media');
  } else {
    const db = getSupabase();
    if (!db) throw new ServiceError('database_unavailable');
    const { data, error } = item
      ? await db
          .from('veyli_challenges')
          .select('id')
          .or(`answer_id.eq.${id},accepted_answer_ids.cs.{${id}}`)
          .limit(1)
      : await db
          .from('veyli_clues')
          .select('challenge:veyli_challenges!inner(sessions:veyli_sessions!inner(id))')
          .eq('media_id', id)
          .limit(1);
    if (error) throw new ServiceError('database_unavailable');
    referenced = Boolean(data?.length);
  }
  if (referenced) throw new ServiceError('content_locked', 409);
}
