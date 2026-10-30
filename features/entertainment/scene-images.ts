import reviewed from '../../data/movie-scene-frames.json';
import type { SourceImage, SourceTitle } from './source-client';

const frames = reviewed.frames as Record<string, { title: string; filePath: string }>;

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

export const sourceModeImage = (item: SourceTitle, mode: string): SourceImage | null => {
  if (mode === 'poster') return item.images.find((image) => image.role === 'poster') || null;
  if (item.provider === 'tmdb' && item.category === 'movies') return reviewedMovieScene(item);
  if (item.provider === 'tmdb' && item.category === 'television')
    return (
      item.images.find((image) => image.role === 'frame' && image.sceneVerified && image.episode) ||
      null
    );
  return item.images.find((image) => image.role !== 'poster') || null;
};

export const withReviewedMovieScene = (item: SourceTitle): SourceTitle => {
  if (item.provider !== 'tmdb' || item.category !== 'movies') return item;
  const scene = reviewedMovieScene(item);
  return {
    ...item,
    images: [...(scene ? [scene] : []), ...item.images.filter((image) => image.role === 'poster')],
  };
};
