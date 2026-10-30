import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { createBufferCache } from '@/lib/buffer-cache';

type ImageOptions = { blur?: number; cropPercent?: number; coverPercent?: number; width?: number };
const cachedRender = createBufferCache();
const widths = [256, 384, 640, 750, 828, 1080, 1200];

export function imageWidth(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get('w')) || 1200;
  return widths.find((width) => width >= requested) || 1200;
}

/** Both public clues and protected previews use this same server transformation. */
export function renderClueImage(source: Buffer, options: ImageOptions) {
  const key = `${createHash('sha256').update(source).digest('hex')}:${JSON.stringify(options)}`;
  return cachedRender(key, () => transformImage(source, options));
}

async function transformImage(
  source: Buffer,
  { blur = 0, cropPercent = 100, coverPercent = 0, width: outputWidth = 1200 }: ImageOptions
) {
  let image = sharp(source, { limitInputPixels: 40000000 }).rotate();
  const info = await image.metadata();
  if (cropPercent < 100 && info.width && info.height) {
    const width = Math.max(1, Math.round((info.width * cropPercent) / 100));
    const height = Math.max(1, Math.round((info.height * cropPercent) / 100));
    image = image.extract({
      left: Math.floor((info.width - width) / 2),
      top: Math.floor((info.height - height) / 2),
      width,
      height,
    });
  }
  const sourceWidth = Math.max(1, Math.round(((info.width || 1200) * cropPercent) / 100));
  image = image.resize({ width: outputWidth, withoutEnlargement: true });
  // Keep the same visual blur when a thumbnail is rendered at a smaller resolution.
  if (blur > 0)
    image = image.blur(
      Math.max(0.3, (blur * Math.min(outputWidth, sourceWidth)) / Math.min(1200, sourceWidth))
    );
  if (coverPercent > 0) {
    const rendered = await image.png().toBuffer({ resolveWithObject: true });
    // Scale both axes equally so the block matches the image and covers this share of its area.
    const scale = Math.sqrt(Math.min(100, coverPercent) / 100);
    const width = Math.max(1, Math.round(rendered.info.width * scale));
    const height = Math.max(1, Math.round(rendered.info.height * scale));
    return sharp(rendered.data)
      .composite([
        {
          input: { create: { width, height, channels: 3, background: '#000000' } },
          gravity: 'centre',
        },
      ])
      .jpeg({ quality: 86 })
      .toBuffer();
  }
  return image.jpeg({ quality: 86 }).toBuffer();
}
