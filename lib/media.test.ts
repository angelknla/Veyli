// @vitest-environment node
import sharp from 'sharp';
import { expect, it } from 'vitest';
import { frameCover } from '@/features/game/presentation';
import { renderClueImage } from './media';

it('bakes a shrinking black centre into the image and uncovers it after completion', async () => {
  const source = await sharp({
    create: { width: 600, height: 400, channels: 3, background: '#ffffff' },
  })
    .png()
    .toBuffer();
  const counts: number[] = [];
  for (const attempts of [0, 1, 2, 3]) {
    const coverPercent = frameCover(attempts, 3, attempts === 3);
    const { data, info } = await sharp(await renderClueImage(source, { coverPercent }))
      .raw()
      .toBuffer({ resolveWithObject: true });
    let black = 0;
    for (let p = 0; p < data.length; p += info.channels)
      if (data[p] < 10 && data[p + 1] < 10 && data[p + 2] < 10) black++;
    counts.push(black);
    expect(data[0]).toBeGreaterThan(240);
    if (attempts < 3) expect(data[(200 * info.width + 300) * info.channels]).toBeLessThan(10);
  }
  expect(counts[0]).toBeGreaterThan(counts[1]);
  expect(counts[0] / (600 * 400)).toBeCloseTo(0.8, 2);
  expect(counts[1]).toBeGreaterThan(counts[2]);
  expect(counts[2]).toBeGreaterThan(0);
  expect(counts[3]).toBe(0);
});

it.each([
  [300, 600],
  [600, 300],
  [400, 400],
  [1200, 500],
])('matches a %ix%i image’s proportions and starts at 80%% of its area', async (width, height) => {
  const source = await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .png()
    .toBuffer();
  const { data, info } = await sharp(
    await renderClueImage(source, { coverPercent: frameCover(0, 8) })
  )
    .raw()
    .toBuffer({ resolveWithObject: true });
  const black = (x: number, y: number) => data[(y * info.width + x) * info.channels] < 10;
  const across = Array.from({ length: info.width }, (_, x) =>
    black(x, Math.floor(info.height / 2))
  ).filter(Boolean).length;
  const down = Array.from({ length: info.height }, (_, y) =>
    black(Math.floor(info.width / 2), y)
  ).filter(Boolean).length;
  expect(across / down).toBeCloseTo(info.width / info.height, 2);
  expect((across * down) / (info.width * info.height)).toBeCloseTo(0.8, 2);
  expect(black(Math.floor(info.width / 2), Math.floor(info.height / 2))).toBe(true);
  expect(black(0, 0)).toBe(false);
});
it('keeps an authored centre crop proportional to the source image', async () => {
  const source = await sharp({
    create: { width: 600, height: 900, channels: 3, background: '#ffffff' },
  })
    .png()
    .toBuffer();
  const widths: number[] = [];
  for (const cropPercent of [10, 25, 50, 100]) {
    const image = await renderClueImage(source, { cropPercent });
    widths.push((await sharp(image).metadata()).width!);
  }
  expect(widths).toEqual([60, 150, 300, 600]);
});

it('renders smaller responsive images, reuses matching renders and invalidates changed content', async () => {
  const source = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: '#ffffff' },
  })
    .png()
    .toBuffer();
  const options = { width: 384, coverPercent: 80 };
  const thumbnail = await renderClueImage(source, options);
  expect((await sharp(thumbnail).metadata()).width).toBe(384);
  expect(await renderClueImage(source, options)).toBe(thumbnail);
  expect((await renderClueImage(source, { coverPercent: 80 })).length).toBeGreaterThan(
    thumbnail.length
  );
  const replacement = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: '#ff0000' },
  })
    .png()
    .toBuffer();
  expect(await renderClueImage(replacement, options)).not.toEqual(thumbnail);
});
