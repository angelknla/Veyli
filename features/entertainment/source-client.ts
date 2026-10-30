import { z } from 'zod';
import { withReviewedMovieScene } from './scene-images';

export type SourceCategory = 'movies' | 'television' | 'games' | 'music' | 'pop-culture';
export type SourceImage = {
  url: string;
  role: 'frame' | 'poster' | 'photo';
  sceneVerified?: boolean;
  episode?: { season: number; number: number };
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
  policy: 'tmdb' | 'rawg' | 'commons';
};
export type SourceTitle = {
  provider: 'tmdb' | 'rawg' | 'musicbrainz' | 'wikidata';
  providerId: string;
  category: SourceCategory;
  title: string;
  year: number;
  sourceUrl: string;
  aliases: string[];
  facts: { label: string; value: string }[];
  images: SourceImage[];
  relatedIds?: Record<string, string>;
};
export class SourceError extends Error {
  constructor(public code: 'provider_unconfigured' | 'provider_unavailable') {
    super(code);
  }
}
const userAgent = 'Veyli/0.1 (entertainment trivia; https://musicbrainz.org/doc/Development)';
const pending = new Map<string, Promise<unknown>>();
const cached = new Map<string, { expires: number; data: unknown }>();
let musicQueue = Promise.resolve();
let musicLastRequest = 0;

/** Bounded caching and request coalescing; never include upstream URLs/keys in errors. */
export async function sourceJson(url: URL | string, timeout = 12000): Promise<unknown> {
  const key = String(url);
  const hit = cached.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  const existing = pending.get(key);
  if (existing) return existing;
  const work = (async () => {
    try {
      if (new URL(key).hostname === 'musicbrainz.org') {
        const turn = musicQueue.then(async () => {
          const delay = Math.max(0, 1100 - (Date.now() - musicLastRequest));
          if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
          musicLastRequest = Date.now();
        });
        musicQueue = turn.catch(() => {});
        await turn;
      }
      const response = await fetch(url, {
        headers: {
          'User-Agent': process.env.SOURCE_USER_AGENT || userAgent,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(timeout),
        next: { revalidate: 86400 },
      });
      if (!response.ok) throw new SourceError('provider_unavailable');
      const data: unknown = await response.json();
      if (cached.size >= 256) cached.delete(cached.keys().next().value!);
      cached.set(key, { expires: Date.now() + 86400000, data });
      return data;
    } catch {
      throw new SourceError('provider_unavailable');
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, work);
  return work;
}
function tmdbUrl(path: string, params: Record<string, string> = {}) {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new SourceError('provider_unconfigured');
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  url.searchParams.set('api_key', key);
  url.searchParams.set('language', 'en-US');
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url;
}
function rawgUrl(path: string, params: Record<string, string> = {}) {
  const key = process.env.RAWG_API_KEY;
  if (!key) throw new SourceError('provider_unconfigured');
  const url = new URL(`https://api.rawg.io/api/${path}`);
  url.searchParams.set('key', key);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url;
}
const named = z.object({ name: z.string() });
const tmdbResult = z.object({
  id: z.number(),
  title: z.string().optional(),
  name: z.string().optional(),
  original_title: z.string().optional(),
  original_name: z.string().optional(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  adult: z.boolean().optional(),
});
function tmdbTitle(
  item: z.infer<typeof tmdbResult>,
  category: 'movies' | 'television'
): SourceTitle {
  const type = category === 'movies' ? 'movie' : 'tv';
  return {
    provider: 'tmdb',
    providerId: String(item.id),
    category,
    title: item.title || item.name || '',
    year: Number((item.release_date || item.first_air_date || '').slice(0, 4)),
    sourceUrl: `https://www.themoviedb.org/${type}/${item.id}`,
    aliases: [item.original_title || item.original_name || ''].filter(Boolean),
    facts: [],
    images: [],
  };
}
const rawgResult = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  released: z.string().nullable(),
});
function rawgTitle(item: z.infer<typeof rawgResult>): SourceTitle {
  return {
    provider: 'rawg',
    providerId: String(item.id),
    category: 'games',
    title: item.name,
    year: Number(item.released?.slice(0, 4)),
    sourceUrl: `https://rawg.io/games/${item.slug}`,
    aliases: [],
    facts: [],
    images: [],
  };
}
export function validSourceTitle(item: SourceTitle) {
  return Boolean(
    item.title.trim() &&
      item.title.length <= 200 &&
      Number.isInteger(item.year) &&
      item.year >= 1800 &&
      item.year <= new Date().getUTCFullYear()
  );
}
export async function discoverScreenTitles(
  category: 'movies' | 'television' | 'games',
  page: number,
  from: number,
  to: number
) {
  if (category === 'games') {
    const result = z.object({ results: z.array(rawgResult) }).parse(
      await sourceJson(
        rawgUrl('games', {
          page: String(page),
          page_size: '40',
          ordering: '-rating',
          dates: `${from}-01-01,${to}-12-31`,
        })
      )
    );
    return result.results.map(rawgTitle).filter(validSourceTitle);
  }
  const type = category === 'movies' ? 'movie' : 'tv';
  const result = z.object({ results: z.array(tmdbResult) }).parse(
    await sourceJson(
      tmdbUrl(`discover/${type}`, {
        page: String(page),
        sort_by: 'popularity.desc',
        include_adult: 'false',
        'vote_count.gte': '100',
        [type === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte']: `${from}-01-01`,
        [type === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte']: `${to}-12-31`,
      })
    )
  );
  return result.results
    .filter((item) => !item.adult)
    .map((item) => tmdbTitle(item, category))
    .filter(validSourceTitle);
}
export async function searchSourceTitles(
  category: SourceCategory,
  query: string
): Promise<SourceTitle[]> {
  if (category === 'movies' || category === 'television') {
    const type = category === 'movies' ? 'movie' : 'tv';
    const pages = await Promise.allSettled(
      [1, 2, 3].map(async (page) =>
        z
          .object({ results: z.array(tmdbResult) })
          .parse(
            await sourceJson(
              tmdbUrl(`search/${type}`, { query, include_adult: 'false', page: String(page) }),
              6000
            )
          )
      )
    );
    return [
      ...new Map(
        pages
          .flatMap((page) => (page.status === 'fulfilled' ? page.value.results : []))
          .map((item) => [item.id, item])
      ).values(),
    ]
      .filter((item) => !item.adult)
      .map((item) => tmdbTitle(item, category))
      .filter(validSourceTitle)
      .slice(0, 60);
  }
  if (category === 'games') {
    const result = z
      .object({ results: z.array(rawgResult) })
      .parse(await sourceJson(rawgUrl('games', { search: query, page_size: '40' }), 6000));
    return result.results.map(rawgTitle).filter(validSourceTitle);
  }
  // Artist/character source records are imported in batches. No expensive SPARQL query per keystroke.
  return [];
}
const detail = z.object({
  genres: z.array(named).default([]),
  production_countries: z.array(named).default([]),
  production_companies: z.array(named).default([]),
  origin_country: z.array(z.string()).default([]),
  runtime: z.number().nullable().optional(),
  number_of_seasons: z.number().optional(),
  original_language: z.string().optional(),
  created_by: z.array(named).default([]),
  credits: z
    .object({
      cast: z.array(named).default([]),
      crew: z.array(named.extend({ job: z.string() })).default([]),
    })
    .optional(),
  images: z
    .object({
      backdrops: z.array(z.object({ file_path: z.string() })).default([]),
      posters: z.array(z.object({ file_path: z.string() })).default([]),
    })
    .optional(),
});
/** Episode stills depict an aired scene; series backdrops may be promotional composites. */
export async function televisionScene(
  item: SourceTitle,
  seasonCount = 3
): Promise<SourceImage | null> {
  if (item.provider !== 'tmdb' || item.category !== 'television') return null;
  const today = new Date().toISOString().slice(0, 10);
  for (let season = 1; season <= Math.min(3, Math.max(1, seasonCount)); season++) {
    try {
      const data = z
        .object({
          episodes: z.array(
            z.object({
              episode_number: z.number().int().positive(),
              air_date: z.string().nullable().optional(),
              still_path: z.string().nullable().optional(),
            })
          ),
        })
        .parse(await sourceJson(tmdbUrl(`tv/${item.providerId}/season/${season}`)));
      const episode = data.episodes.find(
        (episode) => episode.still_path && episode.air_date && episode.air_date <= today
      );
      if (!episode?.still_path) continue;
      return {
        url: `https://image.tmdb.org/t/p/w1280${episode.still_path}`,
        role: 'frame',
        sceneVerified: true,
        episode: { season, number: episode.episode_number },
        sourceUrl: `${item.sourceUrl}/season/${season}/episode/${episode.episode_number}`,
        author: 'Episode still supplied by TMDB; rights remain with the respective owner',
        license: 'TMDB API: attributed non-commercial use',
        licenseUrl: 'https://developer.themoviedb.org/docs/faq',
        policy: 'tmdb',
      };
    } catch {
      // Try another season when its episode images are unavailable.
    }
  }
  return (
    item.images.find((image) => image.role === 'frame' && image.sceneVerified && image.episode) ||
    null
  );
}
export async function hydrateScreenTitle(item: SourceTitle): Promise<SourceTitle> {
  if (item.provider === 'tmdb') {
    const type = item.category === 'movies' ? 'movie' : 'tv';
    const data = detail.parse(
      await sourceJson(
        tmdbUrl(`${type}/${item.providerId}`, {
          append_to_response: 'credits,images',
          include_image_language: 'en,null',
        })
      )
    );
    const people =
      type === 'movie'
        ? data.credits?.crew.filter((person) => person.job === 'Director') || []
        : data.created_by;
    item.facts = [
      { label: 'Year', value: String(item.year) },
      { label: 'Genre', value: data.genres.map((x) => x.name).join(', ') },
      {
        label: type === 'movie' ? 'Director' : 'Creator',
        value: people.map((x) => x.name).join(', '),
      },
      {
        label: 'Cast',
        value:
          data.credits?.cast
            .slice(0, 3)
            .map((x) => x.name)
            .join(', ') || '',
      },
      {
        label: 'Country',
        value:
          data.production_countries.map((x) => x.name).join(', ') || data.origin_country.join(', '),
      },
      {
        label: type === 'movie' ? 'Runtime' : 'Seasons',
        value:
          type === 'movie'
            ? data.runtime
              ? `${data.runtime} minutes`
              : ''
            : String(data.number_of_seasons || ''),
      },
      {
        label: 'Studio',
        value: data.production_companies
          .slice(0, 2)
          .map((x) => x.name)
          .join(', '),
      },
    ].filter((x) => x.value);
    item.images = [
      ...(data.images?.backdrops
        .slice(0, 2)
        .map((image) => ({ path: image.file_path, role: 'frame' as const })) || []),
      ...(data.images?.posters
        .slice(0, 1)
        .map((image) => ({ path: image.file_path, role: 'poster' as const })) || []),
    ].map((image) => ({
      url: `https://image.tmdb.org/t/p/w1280${image.path}`,
      role: image.role,
      sourceUrl: item.sourceUrl,
      author: 'Image supplied by TMDB; rights remain with the respective owner',
      license: 'TMDB API: attributed non-commercial use',
      licenseUrl: 'https://developer.themoviedb.org/docs/faq',
      policy: 'tmdb',
    }));
    if (type === 'tv') {
      const scene = await televisionScene(item, data.number_of_seasons);
      item.images = [
        ...(scene ? [scene] : []),
        ...item.images.filter((image) => image.role === 'poster'),
      ];
      return item;
    }
    return withReviewedMovieScene(item);
  }
  if (item.provider === 'rawg') {
    const data = z
      .object({
        genres: z.array(named).default([]),
        developers: z.array(named).default([]),
        publishers: z.array(named).default([]),
        platforms: z.array(z.object({ platform: named })).default([]),
        metacritic: z.number().nullable().optional(),
        esrb_rating: named.nullable().optional(),
        background_image: z.string().nullable().optional(),
      })
      .parse(await sourceJson(rawgUrl(`games/${item.providerId}`)));
    const screenshots = z
      .object({ results: z.array(z.object({ image: z.string() })) })
      .parse(await sourceJson(rawgUrl(`games/${item.providerId}/screenshots`)));
    item.facts = [
      { label: 'Year', value: String(item.year) },
      { label: 'Genre', value: data.genres.map((x) => x.name).join(', ') },
      { label: 'Developer', value: data.developers.map((x) => x.name).join(', ') },
      { label: 'Publisher', value: data.publishers.map((x) => x.name).join(', ') },
      {
        label: 'Platforms',
        value: data.platforms
          .slice(0, 4)
          .map((x) => x.platform.name)
          .join(', '),
      },
      { label: 'Age rating', value: data.esrb_rating?.name || '' },
      { label: 'Metacritic', value: data.metacritic ? String(data.metacritic) : '' },
    ].filter((x) => x.value);
    item.images = screenshots.results.slice(0, 2).map((image) => ({
      url: image.image,
      role: 'frame',
      sourceUrl: item.sourceUrl,
      author: 'Screenshot supplied by RAWG; rights remain with the respective owner',
      license: 'RAWG API: attributed project use',
      licenseUrl: 'https://rawg.io/apidocs',
      policy: 'rawg',
    }));
    if (data.background_image)
      item.images.push({
        url: data.background_image,
        role: 'poster',
        sourceUrl: item.sourceUrl,
        author: 'Game artwork supplied by RAWG; rights remain with the respective owner',
        license: 'RAWG API: attributed project use',
        licenseUrl: 'https://rawg.io/apidocs',
        policy: 'rawg',
      });
  }
  return item;
}
