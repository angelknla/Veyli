import { afterEach, expect, it, vi } from 'vitest';
import { sourceImage, sourceTitle } from '@/tests/fixtures/sources';
import { imageHostAllowed, imageUseAllowed } from './media-import';
import { clueSignature, dailyModes, dailyPicks, sourceClues } from './schedule';
import {
  hydrateScreenTitle,
  type SourceTitle,
  searchSourceTitles,
  sourceJson,
  televisionScene,
} from './source-client';
import { commonsImage, hydrateWikimediaTitle, permittedCommonsLicense } from './wikimedia';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('uses an aired episode still for TV frame modes while preserving the series poster', async () => {
  vi.stubEnv('TMDB_API_KEY', 'test-secret');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      if (new URL(url).pathname.endsWith('/season/1'))
        return Response.json({
          episodes: [
            { episode_number: 1, air_date: '2099-01-01', still_path: '/unreleased.jpg' },
            { episode_number: 2, air_date: '2000-01-01', still_path: null },
            { episode_number: 3, air_date: '2000-01-02', still_path: '/aired-scene.jpg' },
          ],
        });
      return Response.json({
        number_of_seasons: 1,
        images: {
          backdrops: [{ file_path: '/marketing-art.jpg' }],
          posters: [{ file_path: '/series-poster.jpg' }],
        },
      });
    })
  );
  const item = sourceTitle('tv-episode-scene-test', { category: 'television' });
  const result = await hydrateScreenTitle(item);
  expect(result.images.map((image) => image.url)).toEqual([
    'https://image.tmdb.org/t/p/w1280/aired-scene.jpg',
    'https://image.tmdb.org/t/p/w1280/series-poster.jpg',
  ]);
  expect(result.images[0].episode).toEqual({ season: 1, number: 3 });
  expect(result.images[0].sceneVerified).toBe(true);
});
it('skips promotional TV backdrops when an aired episode still is unavailable', async () => {
  vi.stubEnv('TMDB_API_KEY', 'test-secret');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ episodes: [] }))
  );
  const item = sourceTitle('tv-no-scene-test', {
    category: 'television',
    images: [sourceImage({ url: 'https://image.tmdb.org/t/p/w1280/marketing-art.jpg' })],
  });
  expect(await televisionScene(item, 1)).toBeNull();
});
const title = (id: number, name = `Movie ${id}`) => sourceTitle(id, { title: name });

it('coalesces concurrent source requests and reuses the cached response', async () => {
  const fetch = vi.fn(async () => Response.json({ items: [1] }));
  vi.stubGlobal('fetch', fetch);
  const url = 'https://api.themoviedb.org/test/coalescing';
  expect(await Promise.all([sourceJson(url), sourceJson(url)])).toEqual([
    { items: [1] },
    { items: [1] },
  ]);
  expect(await sourceJson(url)).toEqual({ items: [1] });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('does not include credentials or upstream error bodies in failures', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('private diagnostics', { status: 401 }))
  );
  await expect(
    sourceJson('https://api.themoviedb.org/test/private?api_key=never-expose-this')
  ).rejects.toThrow('provider_unavailable');
});
it('search imports only released, non-adult screen titles and retains original aliases', async () => {
  vi.stubEnv('TMDB_API_KEY', 'test-secret');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        results: [
          {
            id: 1,
            title: 'Eligible',
            original_title: 'Original title',
            release_date: '2001-04-01',
            adult: false,
          },
          { id: 2, title: 'Adult title', release_date: '2000-01-01', adult: true },
          { id: 3, title: 'Future title', release_date: '2200-01-01' },
          { id: 4, title: 'Undated' },
        ],
      })
    )
  );
  const items = await searchSourceTitles('movies', 'unit-test-filtering');
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ title: 'Eligible', year: 2001, aliases: ['Original title'] });
});
it('keeps different answers across modes and rotates through the available pool', () => {
  const pool = Array.from({ length: 60 }, (_, id) => title(id));
  const first = dailyPicks(pool, '2026-10-30', 3);
  expect(new Set(first.map((item) => item.providerId)).size).toBe(3);
  expect(dailyPicks(pool, '2026-10-30', 3)).toEqual(first);
  expect(
    dailyPicks(pool, '2026-10-31', 3).some((item) =>
      first.some((prior) => prior.providerId === item.providerId)
    )
  ).toBe(false);
  expect(dailyPicks([title(1, 'Same'), title(2, 'Same')], '2026-10-30', 2)).toEqual([]);
});
it('searches multiple provider pages rather than narrowing suggestions to the first twelve', async () => {
  vi.stubEnv('TMDB_API_KEY', 'test-secret');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      const page = Number(new URL(url).searchParams.get('page'));
      return Response.json({
        results: Array.from({ length: 20 }, (_, index) => ({
          id: (page - 1) * 20 + index,
          title: `Matching title ${page}-${index}`,
          release_date: '2000-01-01',
          adult: false,
        })),
      });
    })
  );
  const items = await searchSourceTitles('movies', 'expanded-provider-pages-test');
  expect(items).toHaveLength(60);
  expect(new Set(items.map((item) => item.providerId)).size).toBe(60);
});
it('builds eight-attempt Classic clues with the frame retained and One Frame with a single image', () => {
  const facts = [
    { label: 'Year', value: '2000' },
    { label: 'Director', value: 'A director' },
  ];
  const classic = sourceClues(
    'classic',
    '7ce97a14-8c28-4f84-96a5-1152055b7626',
    facts,
    'Example movie',
    2000
  );
  expect(classic).toHaveLength(8);
  expect(classic[0]).toMatchObject({ kind: 'image', presentation: 'full' });
  expect(classic.slice(1).every((clue) => clue.kind === 'text')).toBe(true);
  expect(classic.map((clue) => clue.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(sourceClues('one-frame', 'asset', facts)).toHaveLength(1);
  expect(sourceClues('poster', 'asset', facts).map((clue) => clue.blur_amount)).toEqual([
    30, 20, 13, 8, 5, 3, 1, 0,
  ]);
});
it('requires the configured TMDB usage policy and only downloads from approved image hosts', () => {
  const image = sourceImage();
  expect(imageUseAllowed(image, '')).toBe(false);
  expect(imageUseAllowed(image, 'noncommercial')).toBe(true);
  expect(imageUseAllowed(image, 'licensed')).toBe(true);
  expect(imageHostAllowed(image.url)).toBe(true);
  for (const url of [
    'http://image.tmdb.org/file',
    'https://image.tmdb.org.evil.example/file',
    'https://image.tmdb.org@127.0.0.1/file',
    'https://localhost/file',
  ])
    expect(imageHostAllowed(url)).toBe(false);
});
it('accepts attributable Commons media and rejects restricted or unknown licences', () => {
  for (const license of ['CC BY 3.0', 'CC BY-SA 4.0', 'CC0', 'Public domain'])
    expect(permittedCommonsLicense(license)).toBe(true);
  for (const license of ['CC BY-NC 4.0', 'CC BY-ND 4.0', 'All rights reserved', 'Unknown'])
    expect(permittedCommonsLicense(license)).toBe(false);
});
it('accepts current Commons metadata with a numeric extension version and the official thumbnail host', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        query: {
          pages: [
            {
              imageinfo: [
                {
                  url: 'https://upload.wikimedia.org/test.jpg',
                  thumburl: 'https://thumb.wikimedia.org/test.jpg',
                  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Test.jpg',
                  extmetadata: {
                    CommonsMetadataExtension: { value: 1 },
                    Artist: { value: 'An artist' },
                    LicenseShortName: { value: 'CC BY 3.0' },
                    LicenseUrl: { value: 'https://creativecommons.org/licenses/by/3.0/' },
                  },
                },
              ],
            },
          ],
        },
      })
    )
  );
  const image = await commonsImage('unit-test-current-metadata.jpg');
  expect(image).toMatchObject({
    license: 'CC BY 3.0',
    author: 'An artist',
    url: 'https://thumb.wikimedia.org/test.jpg',
  });
  expect(imageHostAllowed(image!.url)).toBe(true);
});
it('does not claim an album is a debut when the provider catalogue is incomplete', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        count: 200,
        'release-groups': [{ title: 'A later album', 'first-release-date': '2012-01-01' }],
      })
    )
  );
  const item: SourceTitle = {
    ...title(1),
    category: 'music',
    provider: 'wikidata',
    year: 1990,
    relatedIds: { musicbrainz: 'incomplete-catalogue-test' },
  };
  const result = await hydrateWikimediaTitle(item);
  expect(result.year).toBe(1990);
  expect(result.facts[0]).toEqual({ label: 'Album', value: 'A later album (2012)' });
});
it('detects factual clue updates even when the answer and image remain the same', () => {
  const before = sourceClues('classic', 'same-image', [
    { label: 'Director', value: 'Previous credit' },
  ]);
  const after = sourceClues('classic', 'same-image', [
    { label: 'Director', value: 'Corrected credit' },
  ]);
  expect(clueSignature(before)).not.toBe(clueSignature(after));
  expect(clueSignature(before)).toBe(clueSignature(before.map((clue) => ({ ...clue }))));
});
it('adds Poster for TV, games and music only when artwork exists, while keeping core daily answers stable', () => {
  const image = sourceImage({
    role: 'poster',
    policy: 'commons',
    url: 'https://upload.wikimedia.org/cover.jpg',
    license: 'CC0',
  });
  for (const category of ['television', 'games', 'music'] as const) {
    const pool = Array.from({ length: 8 }, (_, id) => ({
      ...title(id),
      category,
      images: [
        {
          ...image,
          role: 'frame' as const,
          ...(category === 'television'
            ? { sceneVerified: true, episode: { season: 1, number: 1 } }
            : {}),
        },
      ],
    }));
    const before = dailyModes(pool, '2026-10-30', category);
    expect(before.map((pick) => pick.mode)).toEqual(['classic', 'one-frame']);
    const after = dailyModes(
      pool.map((item) => ({ ...item, images: [...item.images, image] })),
      '2026-10-30',
      category
    );
    expect(after.map((pick) => pick.mode)).toEqual(['classic', 'one-frame', 'poster']);
    expect(after.slice(0, 2).map((pick) => pick.item.providerId)).toEqual(
      before.map((pick) => pick.item.providerId)
    );
    expect(new Set(after.map((pick) => pick.item.providerId)).size).toBe(3);
  }
  expect(
    dailyModes(
      [title(1), title(2)].map((item) => ({
        ...item,
        provider: 'wikidata' as const,
        images: [{ ...image, role: 'frame' as const }],
      })),
      '2026-10-30',
      'movies'
    ).map((pick) => pick.mode)
  ).toEqual(['classic', 'one-frame']);
});
