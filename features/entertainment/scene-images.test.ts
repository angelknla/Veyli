import { expect, it } from 'vitest';
import { sourceImage, sourceTitle } from '@/tests/fixtures/sources';
import {
  classicScenes,
  reviewedMovieScene,
  sceneLimit,
  sourceModeImage,
  sourceModeImages,
  withReviewedMovieScene,
} from './scene-images';

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
it('follows the reviewed opening with textless backdrops only, and needs a run of them for Classic', () => {
  const textless = (id: number) =>
    sourceImage({ url: `https://image.tmdb.org/t/p/w1280/textless-${id}.jpg`, textless: true });
  const backdrops = Array.from({ length: 5 }, (_, id) => textless(id));
  const film = { ...movie, images: [image, ...backdrops, movie.images[1]] };
  const scenes = sourceModeImages(film, 'classic');
  expect(scenes[0]).toEqual(reviewedMovieScene(film));
  expect(scenes.slice(1)).toEqual(backdrops);
  // The promotional backdrop carries a title treatment, so it never becomes a later reveal.
  expect(scenes.some((scene) => scene.url === image.url)).toBe(false);
  expect(classicScenes(film)).toEqual(scenes);
  expect(withReviewedMovieScene(film).images).toEqual([...scenes, movie.images[1]]);
  // One Frame and Poster still take a single asset from the same title.
  expect(sourceModeImage(film, 'one-frame')).toEqual(scenes[0]);
  expect(sourceModeImages(film, 'poster')).toEqual([movie.images[1]]);
  expect(
    sourceModeImages(
      { ...film, images: Array.from({ length: 12 }, (_, id) => textless(id)) },
      'classic'
    )
  ).toHaveLength(sceneLimit);
});
it('leaves a title with too few scenes to the single-image modes', () => {
  const thin = {
    ...movie,
    images: [sourceImage({ url: 'https://image.tmdb.org/t/p/w1280/only.jpg', textless: true })],
  };
  expect(sourceModeImages(thin, 'classic')).toHaveLength(2);
  expect(classicScenes(thin)).toEqual([]);
  expect(sourceModeImage(thin, 'one-frame')).toEqual(reviewedMovieScene(thin));
});
