import 'server-only';

import { createHash } from 'node:crypto';
import { isTestDatabaseEnabled } from '@/lib/environment';
import { getSupabase } from '@/lib/supabase/server';

type PreviewRow = { public_key: string; clues: unknown[] };
/** Opaque content fingerprints keep browser thumbnails in sync after editorial changes. */
export const previewRevisions = async (keys: string[]): Promise<Record<string, string>> => {
  if (!keys.length) return {};
  let rows: PreviewRow[];
  if (isTestDatabaseEnabled()) {
    const { embeddedPreviewRevisions } = await import('@/tests/support/database');
    rows = await embeddedPreviewRevisions(keys);
  } else {
    const db = getSupabase();
    if (!db) return {};
    const { data, error } = await db
      .from('veyli_challenges')
      .select(
        'public_key,clues:veyli_clues(id,position,media_id,blur_amount,crop_percent,media:veyli_media(storage_path))'
      )
      .in('public_key', keys)
      .eq('clues.position', 1);
    if (error || !data) return {};
    rows = data;
  }
  return Object.fromEntries(
    rows.map((row) => [
      row.public_key,
      createHash('sha256').update(JSON.stringify(row.clues)).digest('hex').slice(0, 16),
    ])
  );
};
