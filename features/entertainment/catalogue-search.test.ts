import { expect, it } from 'vitest';
import { matchCatalogue } from './catalogue-search';

it('offers a broad matching list with aliases, remakes and exact matches ranked first', () => {
  const items = Array.from({ length: 80 }, (_, index) => ({
    slug: `movie-${index}`,
    title: `Movie ${index}`,
    year: 2000 + (index % 20),
    category: 'movies',
    aliases: [] as string[],
  }));
  items.push({ slug: 'exact', title: 'Movie', year: 2010, category: 'movies', aliases: [] });
  items.push({
    slug: 'alias',
    title: 'A different original title',
    year: 2020,
    category: 'movies',
    aliases: ['Móvie alternative'],
  });
  const matches = matchCatalogue(items, 'movie');
  expect(matches).toHaveLength(60);
  expect(matches[0].slug).toBe('exact');
  expect(matches.some((item) => item.slug === 'alias')).toBe(true);
  expect(matches.every((item) => !('aliases' in item))).toBe(true);
  expect(matchCatalogue(items, 'unrelated')).toEqual([]);
});
