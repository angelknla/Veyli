import { z } from 'zod';
import { adminSnapshot, requireAdmin } from '@/features/admin/server';
import { clueSource } from '@/lib/clue-source';
import { apiError, json } from '@/lib/http';
import { imageResponse } from '@/lib/image-response';
import { imageWidth, renderClueImage } from '@/lib/media';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const id = z.uuid().parse((await params).id);
    const snapshot = await adminSnapshot();
    const media = snapshot.media.find((value) => value.id === id);
    if (!media?.storage_path) return json({ error: 'not_found' }, 404);
    const buffer = await clueSource(String(media.storage_path));
    const search = new URL(request.url).searchParams;
    const blur = z.coerce
      .number()
      .min(0)
      .max(100)
      .parse(search.get('blur') || 0);
    const cropPercent = z.coerce
      .number()
      .int()
      .min(10)
      .max(100)
      .parse(search.get('crop') || 100);
    const coverPercent = z.coerce
      .number()
      .int()
      .min(0)
      .max(90)
      .parse(search.get('cover') || 0);
    const rendered = await renderClueImage(buffer, {
      blur,
      cropPercent,
      coverPercent,
      width: imageWidth(request),
    });
    return imageResponse(request, rendered, 'admin');
  } catch (error) {
    return apiError(error);
  }
}
