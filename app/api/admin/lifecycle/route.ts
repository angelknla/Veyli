import { z } from 'zod';
import { adminSnapshot, requireAdmin } from '@/features/admin/server';
import { invalidateHub } from '@/features/game/service';
import { isTestDatabaseEnabled } from '@/lib/environment';
import { apiError, json, sameOrigin } from '@/lib/http';
import { getSupabase } from '@/lib/supabase/server';
export const POST = async (request: Request) => {
  try {
    await requireAdmin();
    sameOrigin(request);
    const input = z
      .object({ id: z.uuid(), status: z.enum(['draft', 'scheduled', 'published', 'archived']) })
      .strict()
      .parse(await request.json());
    const snapshot = await adminSnapshot();
    const challenge = snapshot.challenges.find((value) => value.id === input.id);
    if (!challenge) return json({ error: 'not_found' }, 404);
    if (challenge.played && input.status === 'draft') return json({ error: 'content_locked' }, 409);
    const clues = challenge.clues as { position: number; media_id: string | null }[];
    if (
      input.status !== 'draft' &&
      (!clues.some((clue) => clue.position === 1) ||
        clues.some(
          (clue) =>
            clue.media_id &&
            !snapshot.media.find((media) => media.id === clue.media_id && media.approved)
        ))
    )
      return json({ error: 'approved_clues_required' }, 400);
    if (isTestDatabaseEnabled()) {
      const { embeddedLifecycle } = await import('@/tests/support/database');
      await embeddedLifecycle(input.id, input.status);
    } else {
      const { error } = await getSupabase()!
        .from('veyli_challenges')
        .update({ status: input.status })
        .eq('id', input.id);
      if (error) return json({ error: 'content_locked' }, 409);
    }
    invalidateHub();
    return json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
};
