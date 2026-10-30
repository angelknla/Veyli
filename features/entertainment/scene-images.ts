import reviewed from '../../data/movie-scene-frames.json';
import { classicSceneClues } from '../game/presentation';
import type { SourceImage, SourceTitle } from './source-client';

const frames = reviewed.frames as Record<string, { title: string; filePath: string }>;

/** Classic shows a different scene of the same title after every miss. */
export const sceneLimit = classicSceneClues;
export const minimumScenes = 4;
export const sceneCategories = ['movies', 'television', 'games'];

/** TMDB backdrops include key art; only visually reviewed movie scenes qualify as frames. */
export const reviewedMovieScene = (item: SourceTitle): SourceImage | null => {
  if (item.provider !== 'tmdb' || item.category !== 'movies') return null;
  const frame = frames[item.providerId];
  if (!frame) return null;
  return {
    url: `https://image.tmdb.org/t/p/w1280${frame.filePath}`,
    role: 'frame',
    sceneVerified: true,
    sourceUrl: item.sourceUrl,
    author: 'Image supplied by TMDB; rights remain with the respective owner',
    license: 'TMDB API: attributed non-commercial use',
    licenseUrl: 'https://developer.themoviedb.org/docs/faq',
    policy: 'tmdb',
  };
};
/** Textless backdrops carry no title treatment, so they stay fair as later reveals. */
const textlessMovieScenes = (item: SourceTitle, exclude?: string) =>
  item.images.filter((image) => image.role === 'frame' && image.textless && image.url !== exclude);

/** The reviewed scene always opens the round; the rest only ever follow a miss. */
export const sourceModeImages = (item: SourceTitle, mode: string): SourceImage[] => {
  const limit = mode === 'classic' ? sceneLimit : 1;
  if (mode === 'poster') {
    const poster = item.images.find((image) => image.role === 'poster');
    return poster ? [poster] : [];
  }
  if (item.provider === 'tmdb' && item.category === 'movies') {
    const opening = reviewedMovieScene(item);
    if (!opening) return [];
    return [opening, ...textlessMovieScenes(item, opening.url)].slice(0, limit);
  }
  if (item.provider === 'tmdb' && item.category === 'television')
    return item.images
      .filter((image) => image.role === 'frame' && image.sceneVerified && image.episode)
      .slice(0, limit);
  return item.images.filter((image) => image.role !== 'poster').slice(0, limit);
};
export const sourceModeImage = (item: SourceTitle, mode: string): SourceImage | null => {
  return sourceModeImages(item, mode)[0] || null;
};
/** A title without enough distinct scenes is left to the single-image modes instead. */
export const classicScenes = (item: SourceTitle): SourceImage[] => {
  if (!sceneCategories.includes(item.category)) return [];
  const scenes = sourceModeImages(item, 'classic');
  return scenes.length >= minimumScenes ? scenes : [];
};

export const withReviewedMovieScene = (item: SourceTitle): SourceTitle => {
  if (item.provider !== 'tmdb' || item.category !== 'movies') return item;
  const scene = reviewedMovieScene(item);
  return {
    ...item,
    images: [
      ...(scene ? [scene] : []),
      ...textlessMovieScenes(item, scene?.url),
      ...item.images.filter((image) => image.role === 'poster'),
    ],
  };
};
