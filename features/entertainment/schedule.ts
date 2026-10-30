import { createHash } from 'node:crypto';
import { posterBlur } from '../game/presentation';
import { sourceModeImage } from './scene-images';
import type { SourceTitle } from './source-client';

type ClueShape = {
  position: number;
  kind: string;
  media_id?: string | null;
  text_content?: string | null;
  presentation: string;
  blur_amount: number;
  crop_percent: number;
};
export const clueSignature = (clues: ClueShape[]) => {
  return JSON.stringify(
    [...clues]
      .sort((a, b) => a.position - b.position)
      .map((clue) => [
        clue.position,
        clue.kind,
        clue.media_id || null,
        clue.text_content || null,
        clue.presentation,
        clue.blur_amount,
        clue.crop_percent,
      ])
  );
};

export const orderedPool = (items: SourceTitle[]) => {
  return [
    ...new Map(items.map((item) => [`${item.provider}:${item.providerId}`, item])).values(),
  ].sort((a, b) =>
    createHash('sha256')
      .update(`${a.provider}:${a.providerId}`)
      .digest('hex')
      .localeCompare(createHash('sha256').update(`${b.provider}:${b.providerId}`).digest('hex'))
  );
};
/** Rotate the whole pool, keeping each day's modes on separate answers. */
export const dailyPicks = (items: SourceTitle[], day: string, count: number) => {
  const pool = orderedPool(items);
  if (pool.length < count) return [];
  const ordinal = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000);
  const result: SourceTitle[] = [];
  const identities = new Set<string>();
  for (let offset = 0; offset < pool.length && result.length < count; offset++) {
    const item = pool[(ordinal * count + offset) % pool.length];
    const key = `${item.title.toLowerCase()}:${item.year}`;
    if (identities.has(key)) continue;
    identities.add(key);
    result.push(item);
  }
  return result.length === count ? result : [];
};
export const dailyModes = (
  items: SourceTitle[],
  day: string,
  category: SourceTitle['category']
) => {
  const frames = items.filter((item) => sourceModeImage(item, 'classic'));
  const core = dailyPicks(frames, day, category === 'movies' && frames.length >= 3 ? 3 : 2);
  if (!core.length) return [];
  const picks = [
    { mode: 'classic', item: core[0] },
    { mode: 'one-frame', item: core[1] },
  ];
  if (category === 'pop-culture') return picks;
  const blocked = new Set(
    core.slice(0, 2).map((item) => `${item.title.toLowerCase()}:${item.year}`)
  );
  const covers = items.filter(
    (item) =>
      item.images.some((image) => image.role === 'poster') &&
      !blocked.has(`${item.title.toLowerCase()}:${item.year}`)
  );
  const poster =
    category === 'movies' && core[2]?.images.some((image) => image.role === 'poster')
      ? core[2]
      : dailyPicks(covers, day, 1)[0];
  if (poster?.images.some((image) => image.role === 'poster'))
    picks.push({ mode: 'poster', item: poster });
  return picks;
};
export const sourceClues = (
  mode: string,
  mediaId: string,
  facts: SourceTitle['facts'],
  title = '',
  year?: number
) => {
  const frame = {
    position: 1,
    kind: 'image' as const,
    media_id: mediaId,
    presentation: 'full' as const,
    blur_amount: 0,
    crop_percent: 100,
  };
  if (mode === 'classic') {
    const expanded = [...facts];
    if (title) {
      const letters = [...title.replace(/\s/g, '')];
      const fallback = [
        { label: 'Decade', value: year ? `${Math.floor(year / 10) * 10}s` : '' },
        { label: 'Words in the name', value: String(title.trim().split(/\s+/).length) },
        { label: 'Starts with', value: letters[0] || '' },
        { label: 'Name length', value: `${letters.length} characters, excluding spaces` },
        { label: 'Ends with', value: letters.at(-1) || '' },
      ];
      expanded.push(...fallback.filter((fact) => fact.value));
    }
    return [
      frame,
      ...expanded.slice(0, 7).map((fact, index) => ({
        position: index + 2,
        kind: 'text' as const,
        text_content: `${fact.label}: ${fact.value}`,
        media_id: null,
        presentation: 'full' as const,
        blur_amount: 0,
        crop_percent: 100,
      })),
    ];
  }
  if (mode === 'poster')
    return Array.from({ length: 8 }, (_, index) => ({
      ...frame,
      position: index + 1,
      presentation: 'blur' as const,
      blur_amount: posterBlur(index),
    }));
  return [frame];
};
