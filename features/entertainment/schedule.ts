import { createHash } from 'node:crypto';
import { classicSceneClues, posterBlur } from '../game/presentation';
import { classicScenes, sourceModeImage } from './scene-images';
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
/** One authored clue row: Classic fills both the media and the text column. */
type SourceClue = {
  position: number;
  kind: 'image' | 'text' | 'quote';
  media_id: string | null;
  text_content: string | null;
  presentation: 'full' | 'crop' | 'blur';
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
const identity = (item: SourceTitle) => `${item.title.toLowerCase()}:${item.year}`;
/** Each mode draws from the pool it can actually present, on a separate answer. */
export const dailyModes = (
  items: SourceTitle[],
  day: string,
  category: SourceTitle['category']
) => {
  const picks: { mode: string; item: SourceTitle }[] = [];
  const taken = new Set<string>();
  const unused = (item: SourceTitle) => !taken.has(identity(item));
  const claim = (mode: string, item?: SourceTitle) => {
    if (!item) return;
    picks.push({ mode, item });
    taken.add(identity(item));
  };
  claim(
    'classic',
    dailyPicks(
      items.filter((item) => classicScenes(item).length),
      day,
      1
    )[0]
  );
  const frames = items.filter((item) => sourceModeImage(item, 'one-frame') && unused(item));
  claim('one-frame', dailyPicks(frames, day, 1)[0]);
  if (!picks.some((pick) => pick.mode === 'one-frame') || category === 'pop-culture') return picks;
  const covers = items.filter(
    (item) => item.images.some((image) => image.role === 'poster') && unused(item)
  );
  claim('poster', dailyPicks(covers, day, 1)[0]);
  return picks;
};
/** Classic spends one clue per attempt; the other modes reuse a single asset. */
export const sourceClues = (
  mode: string,
  mediaIds: string[],
  facts: SourceTitle['facts'] = []
): SourceClue[] => {
  const frame: SourceClue = {
    position: 1,
    kind: 'image',
    media_id: mediaIds[0] ?? null,
    text_content: null,
    presentation: 'full',
    blur_amount: 0,
    crop_percent: 100,
  };
  if (mode === 'classic')
    // A clue row carries both columns, so one miss opens a new scene and the fact beside it.
    return mediaIds.slice(0, classicSceneClues).map((media, index) => {
      // The opening scene arrives on its own; every fact after it is earned by a miss.
      const fact = index > 0 ? facts[index - 1] : undefined;
      return {
        ...frame,
        position: index + 1,
        media_id: media,
        text_content: fact ? `${fact.label}: ${fact.value}` : null,
      };
    });
  if (mode === 'poster')
    return Array.from({ length: 8 }, (_, index) => ({
      ...frame,
      position: index + 1,
      presentation: 'blur' as const,
      blur_amount: posterBlur(index),
    }));
  return [frame];
};
