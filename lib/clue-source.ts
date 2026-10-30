import 'server-only';

import { createBufferCache } from '@/lib/buffer-cache';
import { ServiceError } from '@/lib/database';
import { isTestDatabaseEnabled } from '@/lib/environment';
import { getSupabase } from '@/lib/supabase/server';

const cachedSource = createBufferCache();

export const clueSource = (storagePath: string): Promise<Buffer> => {
  return cachedSource(storagePath, async () => {
    if (isTestDatabaseEnabled()) {
      const { fixtureImage } = await import('@/tests/fixtures/media');
      return fixtureImage(storagePath);
    }
    const db = getSupabase();
    if (!db) throw new ServiceError('database_unavailable');
    const { data, error } = await db.storage.from('veyli-media').download(storagePath);
    if (error || !data) throw new ServiceError('media_unavailable');
    return Buffer.from(await data.arrayBuffer());
  });
};
