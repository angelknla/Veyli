import 'server-only';
import { isTestDatabaseEnabled } from '@/lib/environment';

import { reportFailure } from '@/lib/monitoring';
import { getSupabase } from '@/lib/supabase/server';
export class ServiceError extends Error {
  constructor(
    public code: string,
    public status = 503
  ) {
    super(code);
  }
}
export async function rpc(
  name: string,
  parameters: Record<string, unknown> = {}
): Promise<unknown> {
  if (!/^veyli_[a-z_]+$/.test(name)) throw new ServiceError('invalid_operation', 400);
  if (isTestDatabaseEnabled()) {
    const { embeddedRpc } = await import('@/tests/support/database');
    return embeddedRpc(name, parameters);
  }
  const db = getSupabase();
  if (!db) throw new ServiceError('database_unavailable');
  const { data, error } = await db.rpc(name, parameters);
  if (error) {
    if (name === 'veyli_admin_save') {
      const codes: Record<string, string> = {
        23505: 'content_conflict',
        23503: 'invalid_reference',
        23514: 'invalid_rules',
        P0001: 'content_locked',
      };
      if (codes[error.code]) throw new ServiceError(codes[error.code], 409);
    }
    reportFailure(error.code || 'database_error', name);
    throw new ServiceError('database_unavailable');
  }
  return data;
}
