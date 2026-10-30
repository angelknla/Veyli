import { initialImage } from '@/features/challenges/preview';
import { slugSchema } from '@/features/game/contracts';
import { clueSource } from '@/lib/clue-source';
import { apiError, json, rateLimit } from '@/lib/http';
import { imageResponse } from '@/lib/image-response';
import { imageWidth, renderClueImage } from '@/lib/media';

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const key = slugSchema.parse((await params).key);
    await rateLimit(request, 'preview');
    const clue = await initialImage(key);
    if (!clue) return json({ error: 'not_found' }, 404);
    const buffer = await renderClueImage(await clueSource(clue.media.storage_path), {
      blur: clue.blur_amount,
      cropPercent: clue.crop_percent,
      coverPercent: clue.coverPercent,
      width: imageWidth(request),
    });
    return imageResponse(request, buffer, 'public');
  } catch (error) {
    return apiError(error);
  }
}
