import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { requireAdmin } from '@/features/admin/server';
import { apiError, json, sameOrigin } from '@/lib/http';
import { getSupabase } from '@/lib/supabase/server';
export async function POST(request: Request) {
  try {
    await requireAdmin();
    sameOrigin(request);
    if (Number(request.headers.get('content-length') || 0) > 10485760)
      return json({ error: 'image_too_large' }, 413);
    const file = (await request.formData()).get('file');
    if (!(file instanceof File) || file.size > 10485760 || file.size === 0)
      return json({ error: 'invalid_image' }, 400);
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = sharp(buffer, { limitInputPixels: 40000000 });
    const meta = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(meta.format || ''))
      return json({ error: 'unsupported_image' }, 400);
    const cleaned = await image
      .rotate()
      .resize({ width: 2000, withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
    const path = `admin/${randomUUID()}.jpg`;
    const db = getSupabase();
    if (!db) return json({ error: 'database_unavailable' }, 503);
    const { error } = await db.storage
      .from('veyli-media')
      .upload(path, cleaned, { contentType: 'image/jpeg' });
    if (error) return json({ error: 'upload_failed' }, 503);
    return json({ storagePath: path });
  } catch (error) {
    return apiError(error);
  }
}
