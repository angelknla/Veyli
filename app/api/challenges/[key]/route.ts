import { slugSchema } from '@/features/game/contracts';
import { engine } from '@/features/game/service';
import { apiError, json, rateLimit } from '@/lib/http';
import { playerIdentity } from '@/lib/security/player';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const key = slugSchema.parse((await params).key);
    const player = (await playerIdentity())!;
    await rateLimit(request, 'session', player);
    return json(await engine.open(player, key));
  } catch (error) {
    return apiError(error);
  }
}
