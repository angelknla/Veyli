import { expect, it } from 'vitest';
import { sourceImage, sourceTitle } from '@/tests/fixtures/sources';
import { rangePicks } from './range-rounds';
import type { SourceImage } from './source-client';

const image = (role: SourceImage['role'], id: string = role) =>
  sourceImage({ role, policy: 'commons', url: `https://upload.wikimedia.org/${id}.jpg` });
// Classic spends a scene per attempt, so only a title with a run of frames qualifies for it.
const sceneRun = (id: string) =>
  Array.from({ length: 4 }, (_, index) => image('frame', `${id}-${index}`));
const title = (id: string, images: SourceImage[]) =>
  sourceTitle(id, { title: id, year: 2010, provider: 'wikidata', images });
it('keeps ranged modes distinct, excludes existing daily answers and uses covers only for Poster', () => {
  const items = [
    title('current', sceneRun('current')),
    title('frame-a', sceneRun('frame-a')),
    title('frame-b', sceneRun('frame-b')),
    title('cover', [image('poster')]),
  ];
  const picks = rangePicks(
    items,
    '2026-10-30',
    ['classic', 'one-frame', 'poster'],
    new Set(['current:2010'])
  );
  expect(picks).toHaveLength(3);
  expect(new Set(picks.map((pick) => pick.item.providerId)).size).toBe(3);
  expect(picks.map((pick) => pick.item.providerId)).not.toContain('current');
  expect(picks.find((pick) => pick.mode === 'poster')?.item.providerId).toBe('cover');
  expect(
    rangePicks(items, '2026-10-30', ['classic', 'one-frame', 'poster'], new Set(['current:2010']))
  ).toEqual(picks);
});
