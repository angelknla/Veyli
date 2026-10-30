import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { mediaInput } from '../admin/contracts';
import type { SourceImage } from './source-client';

export function imageUseAllowed(image: SourceImage, tmdbUsage = process.env.TMDB_IMAGE_USAGE) {
  return (
    image.policy === 'commons' ||
    image.policy === 'rawg' ||
    (image.policy === 'tmdb' && ['noncommercial', 'licensed'].includes(tmdbUsage || ''))
  );
}
export function imageHostAllowed(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      ['image.tmdb.org', 'media.rawg.io', 'upload.wikimedia.org', 'thumb.wikimedia.org'].includes(
        url.hostname
      )
    );
  } catch {
    return false;
  }
}
export async function importImage(db: SupabaseClient, image: SourceImage) {
  if (!imageUseAllowed(image) || !imageHostAllowed(image.url)) return null;
  const hash = createHash('sha256').update(image.url).digest('hex').slice(0, 20);
  const slug = `source-${hash}`;
  const existing = await db
    .from('veyli_media')
    .select('id,approved')
    .eq('slug', slug)
    .maybeSingle();
  if (existing.error) throw new Error('Veyli media lookup failed');
  if (existing.data) return existing.data.approved ? (existing.data.id as string) : null;
  let source: Buffer | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(image.url, {
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
      headers: {
        'User-Agent': process.env.SOURCE_USER_AGENT || 'Veyli/0.1 (entertainment trivia)',
      },
    });
    if (response.status === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      continue;
    }
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
      throw new Error('Source image unavailable');
    if (Number(response.headers.get('content-length')) > 15000000)
      throw new Error('Source image too large');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Source image unavailable');
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.length;
      if (bytes > 15000000) {
        await reader.cancel();
        throw new Error('Source image too large');
      }
      chunks.push(result.value);
    }
    source = Buffer.concat(chunks);
    break;
  }
  if (!source) throw new Error('Source image unavailable');
  const output = await sharp(source, { limitInputPixels: 40000000 })
    .rotate()
    .resize({ width: 1280, withoutEnlargement: true })
    .jpeg({ quality: 86 })
    .toBuffer();
  const path = `admin/${slug}.jpg`;
  const upload = await db.storage
    .from('veyli-media')
    .upload(path, output, { contentType: 'image/jpeg', upsert: false });
  if (
    upload.error &&
    !['409', 'Duplicate'].includes(upload.error.name) &&
    !('statusCode' in upload.error && String(upload.error.statusCode) === '409')
  )
    throw new Error('Source media upload failed');
  const record = mediaInput.parse({
    id: randomUUID(),
    slug,
    storage_path: path,
    kind: 'image',
    author: image.author,
    license:
      image.policy === 'tmdb' && process.env.TMDB_IMAGE_USAGE === 'licensed'
        ? 'TMDB API: commercial licence configured'
        : image.license,
    license_url: image.licenseUrl,
    source_url: image.sourceUrl,
    approved: true,
  });
  const saved = await db
    .from('veyli_media')
    .upsert(record, { onConflict: 'slug', ignoreDuplicates: true });
  if (saved.error) throw new Error('Source media registration failed');
  const actual = await db.from('veyli_media').select('id,approved').eq('slug', slug).single();
  if (actual.error || !actual.data.approved) throw new Error('Source media registration failed');
  return actual.data.id as string;
}
