import { z } from 'zod';
import { achievementSchema, completions } from '@/features/game/service';
import { rpc } from '@/lib/database';
import { apiError, json } from '@/lib/http';
import { playerIdentity } from '@/lib/security/player';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const player = await playerIdentity(false);
    return json({
      completions: player ? await completions(player) : [],
      achievements: z.array(achievementSchema).parse(await rpc('veyli_achievement_definitions')),
    });
  } catch (error) {
    return apiError(error);
  }
}
