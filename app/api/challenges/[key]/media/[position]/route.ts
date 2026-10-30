import { z } from 'zod';
import { slugSchema } from '@/features/game/contracts';
import { clueImageOptions } from '@/features/game/presentation';
import { engine } from '@/features/game/service';
import { clueSource } from '@/lib/clue-source';
import { rpc } from '@/lib/database';
import { apiError, json, rateLimit } from '@/lib/http';
import { imageResponse } from '@/lib/image-response';
import { imageWidth, renderClueImage } from '@/lib/media';
import { playerIdentity } from '@/lib/security/player';

const mediaSchema = z.object({
  storagePath: z.string(),
  presentation: z.string(),
  blur: z.number(),
  cropPercent: z.number(),
  contentType: z.string(),
});
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ key: string; position: string }> }
) => {
  try {
    const { key, position } = await params;
    slugSchema.parse(key);
    const index = z.coerce.number().int().min(1).max(12).parse(position);
    const player = await playerIdentity(false);
    if (!player) return json({ error: 'not_found' }, 404);
    await rateLimit(request, 'media', player);
    const state = await engine.open(player, key);
    if (state.challenge.mode.slug === 'classic' && index !== 1)
      return json({ error: 'not_found' }, 404);
    const result = await rpc('veyli_media_access', {
      player_digest: player,
      challenge_key: key,
      clue_position: index,
    });
    if (!result) return json({ error: 'not_found' }, 404);
    const media = mediaSchema.parse(result);
    const source = await clueSource(media.storagePath);
    const buffer = await renderClueImage(source, {
      ...clueImageOptions(
        {
          mode: state.challenge.mode.slug,
          category: state.challenge.category.slug,
          attemptsUsed: state.challenge.mode.slug === 'poster' ? index - 1 : state.attemptsUsed,
          attemptLimit: state.challenge.attemptLimit,
          complete: state.status !== 'in_progress',
        },
        { blur: media.blur, cropPercent: media.cropPercent }
      ),
      width: imageWidth(request),
    });
    return imageResponse(request, buffer, 'player');
  } catch (error) {
    return apiError(error);
  }
};
