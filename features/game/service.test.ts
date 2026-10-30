import { afterEach, expect, it, vi } from 'vitest';
import { importCatalogue } from '@/features/entertainment/catalogue-import';
import { broadCatalogueSearch } from '@/features/entertainment/catalogue-search';
import { searchSourceTitles } from '@/features/entertainment/source-client';
import { sourceTitle } from '@/tests/fixtures/sources';
import { searchCatalogue } from './service';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ getSupabase: () => ({}) }));
vi.mock('@/features/entertainment/catalogue-search', () => ({ broadCatalogueSearch: vi.fn() }));
vi.mock('@/features/entertainment/catalogue-import', () => ({ importCatalogue: vi.fn() }));
vi.mock('@/features/entertainment/source-client', () => ({ searchSourceTitles: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
});

it('serves local search immediately and shares provider imports only for explicit expansion', async () => {
  vi.stubEnv('TMDB_API_KEY', 'test-key');
  const local = [{ slug: 'matrix', title: 'Matrix', year: 1999, category: 'movies' }];
  vi.mocked(broadCatalogueSearch).mockResolvedValue(local);
  let release = (_titles: ReturnType<typeof sourceTitle>[]) => {};
  vi.mocked(searchSourceTitles).mockReturnValue(
    new Promise((resolve) => {
      release = resolve;
    })
  );
  expect(await searchCatalogue('matrix', 'movies')).toEqual({ items: local, more: true });
  expect(searchSourceTitles).not.toHaveBeenCalled();
  expect(importCatalogue).not.toHaveBeenCalled();
  const first = searchCatalogue('matrix', 'movies', true);
  const second = searchCatalogue(' MATRIX ', 'movies', true);
  await vi.waitFor(() => expect(searchSourceTitles).toHaveBeenCalledTimes(1));
  release([sourceTitle('matrix')]);
  expect(await first).toEqual({ items: local, more: false });
  expect(await second).toEqual({ items: local, more: false });
  expect(importCatalogue).toHaveBeenCalledTimes(1);
  await searchCatalogue('matrix', 'movies', true);
  expect(importCatalogue).toHaveBeenCalledTimes(1);
});
