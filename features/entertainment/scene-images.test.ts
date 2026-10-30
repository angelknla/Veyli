import { expect, it } from 'vitest';
import { sourceImage, sourceTitle } from '@/tests/fixtures/sources';
import { reviewedMovieScene, sourceModeImage, withReviewedMovieScene } from './scene-images';

const image = sourceImage({ url: 'https://image.tmdb.org/t/p/w1280/promotional-backdrop.jpg' });
const movie = sourceTitle('1204680', {
  title: 'Coyote vs. Acme',
  year: 2026,
  images: [
    image,
    sourceImage({ url: 'https://image.tmdb.org/t/p/w1280/poster.jpg', role: 'poster' }),
  ],
});

it('uses a reviewed scene instead of the promotional backdrop for both frame modes, retaining Poster artwork', () => {
  const frame = sourceModeImage(movie, 'classic');
  expect(frame?.sceneVerified).toBe(true);
  expect(frame?.url).not.toBe(image.url);
  expect(sourceModeImage(movie, 'one-frame')).toEqual(frame);
  expect(sourceModeImage(movie, 'poster')?.url).toContain('/poster.jpg');
  const hydrated = withReviewedMovieScene(movie);
  expect(hydrated.images).toEqual([reviewedMovieScene(movie), movie.images[1]]);
});
it('does not turn an unreviewed movie backdrop into a scene even when its role claims to be a frame', () => {
  const unreviewed = { ...movie, providerId: 'unreviewed-film' };
  expect(sourceModeImage(unreviewed, 'classic')).toBeNull();
  expect(sourceModeImage(unreviewed, 'one-frame')).toBeNull();
  expect(withReviewedMovieScene(unreviewed).images).toEqual([movie.images[1]]);
  expect(sourceModeImage(unreviewed, 'poster')).not.toBeNull();
});
