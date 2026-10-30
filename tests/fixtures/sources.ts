import type { SourceImage, SourceTitle } from '@/features/entertainment/source-client';

export const sourceTitle = (
  id: string | number,
  overrides: Partial<SourceTitle> = {}
): SourceTitle => {
  return {
    provider: 'tmdb',
    providerId: String(id),
    title: `Movie ${id}`,
    year: 2000,
    category: 'movies',
    sourceUrl: `https://www.themoviedb.org/movie/${id}`,
    aliases: [],
    facts: [],
    images: [],
    ...overrides,
  };
};

export const sourceImage = (overrides: Partial<SourceImage> = {}): SourceImage => {
  return {
    url: 'https://image.tmdb.org/t/p/w1280/example.jpg',
    role: 'frame',
    policy: 'tmdb',
    sourceUrl: 'https://www.themoviedb.org/movie/1',
    author: 'Creator',
    license: 'TMDB',
    licenseUrl: 'https://developer.themoviedb.org/docs/faq',
    ...overrides,
  };
};
