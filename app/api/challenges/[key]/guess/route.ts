import { z } from 'zod';
import { slugSchema } from '@/features/game/contracts';
import { engine } from '@/features/game/service';
import { apiError, json, rateLimit, sameOrigin } from '@/lib/http';
import { playerIdentity } from '@/lib/security/player';

const input = z.object({ slug: slugSchema }).strict();
export const POST = async (request: Request, { params }: { params: Promise<{ key: string }> }) => {
  try {
    sameOrigin(request);
    if (Number(request.headers.get('content-length') || 0) > 2048)
      return json({ error: 'request_too_large' }, 413);
    const key = slugSchema.parse((await params).key);
    const text = await request.text();
    if (text.length > 2048) return json({ error: 'request_too_large' }, 413);
    const body = input.parse(JSON.parse(text));
    const player = await playerIdentity(false);
    if (!player) return json({ error: 'session_required' }, 403);
    await rateLimit(request, 'guess', player);
    return json(await engine.guess(player, key, body.slug));
  } catch (error) {
    return apiError(error);
  }
};
