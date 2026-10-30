import 'server-only';
import { after } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { syncSources } from './sync';

let nextCheck = 0;
/** Refresh the rolling source queue after serving cached puzzles, at most once a day. */
export const maintainSourceQueue = () => {
  if (
    process.env.SOURCE_SYNC_ENABLED !== 'true' ||
    process.env.VEYLI_INTEGRATION_DATABASE ||
    Date.now() < nextCheck
  )
    return;
  nextCheck = Date.now() + 3600000;
  after(async () => {
    const db = getSupabase();
    if (!db) return;
    try {
      const latest = await db
        .from('veyli_items')
        .select('provenance')
        .not('provenance->>batchImportedAt', 'is', null)
        .order('provenance->>batchImportedAt', { ascending: false })
        .limit(1);
      if (latest.error) return;
      const synced = Date.parse(latest.data?.[0]?.provenance?.batchImportedAt || '');
      if (Number.isFinite(synced) && Date.now() - synced < 86400000) return;
      await syncSources(db, { pages: 1, poolSize: 20, days: 30 });
    } catch {
      /* Cached source puzzles and original fallback content remain playable. */
    }
  });
};
