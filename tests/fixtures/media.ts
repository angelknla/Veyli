import sharp from 'sharp';

const images = new Map<string, Promise<Buffer>>();
const portraits = new Set([
  'alice',
  'lady-gaga',
  'sherlock-holmes',
  'taylor-swift',
  'trip-moon-poster',
]);
const names = new Set([
  ...portraits,
  'nosferatu',
  'trip-moon',
  'bonanza',
  'lucy-show',
  'beverly-hillbillies',
  'supertuxkart',
  'zero-ad',
  'minetest',
]);

/** Synthetic images keep integration tests independent of downloaded entertainment assets. */
export const fixtureImage = (storagePath: string): Promise<Buffer> => {
  if (
    !process.env.VEYLI_INTEGRATION_DATABASE ||
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL
  )
    throw new Error('integration_media_disabled');
  const name = /^admin\/test-([a-z0-9-]+)\.jpg$/.exec(storagePath)?.[1];
  // Classic scenes are numbered variants of a title's frame, each rendered differently.
  const base = name?.replace(/-scene-\d+$/, '');
  if (!name || !base || !names.has(base)) throw new Error('unknown_fixture_media');
  if (!images.has(name)) {
    const width = portraits.has(base) ? 480 : 800;
    const height = portraits.has(base) ? 720 : 450;
    // Space the scenes well apart so each reveal is visibly a different image.
    const scene = Number(/-scene-(\d+)$/.exec(name)?.[1] || 0);
    const seed =
      ([...base].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) + scene * 40) % 256;
    const pixels = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 3;
        pixels[offset] = (x + seed) % 256;
        pixels[offset + 1] = (y + seed * 2) % 256;
        pixels[offset + 2] = (Math.floor(x / 20) * 37 + Math.floor(y / 20) * 61 + seed) % 256;
      }
    images.set(
      name,
      sharp(pixels, { raw: { width, height, channels: 3 } })
        .jpeg()
        .toBuffer()
    );
  }
  return images.get(name)!;
};
