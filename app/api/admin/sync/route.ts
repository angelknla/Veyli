import { requireAdmin } from '@/features/admin/server';
import { syncSources } from '@/features/entertainment/sync';
import { invalidateHub } from '@/features/game/service';
import { apiError, json, sameOrigin } from '@/lib/http';
import { getSupabase } from '@/lib/supabase/server';

export const maxDuration = 300;
export const POST = async (request: Request) => {
  try {
    await requireAdmin();
    sameOrigin(request);
    const db = getSupabase();
    if (!db || process.env.VEYLI_INTEGRATION_DATABASE)
      return json({ error: 'source_sync_unavailable' }, 503);
    const result = await syncSources(db, { pages: 1, poolSize: 20, days: 30 });
    invalidateHub();
    return json(result);
  } catch (error) {
    return apiError(error);
  }
};
