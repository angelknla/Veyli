import 'server-only';
import { z } from 'zod';
import { ServiceError } from '@/lib/database';
export type ProviderItem = {
  provider: string;
  providerId: string;
  title: string;
  year: number;
  category: string;
  sourceUrl: string;
  aliases: string[];
};
export const providerInput = z.object({
  provider: z.enum(['tmdb', 'rawg', 'igdb']),
  query: z.string().trim().min(2).max(100),
  kind: z.enum(['movies', 'television', 'games']),
});
async function requestJson(url: URL | string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(8000),
      ...(options.cache === 'no-store' ? {} : { next: { revalidate: 3600 } }),
    });
    if (!response.ok) throw new Error();
    return await response.json();
  } catch {
    throw new ServiceError('provider_unavailable', 503);
  }
}
let twitchToken: { value: string; expiry: number } | null = null;
async function igdbToken() {
  if (twitchToken && twitchToken.expiry > Date.now()) return twitchToken.value;
  const client = process.env.IGDB_CLIENT_ID;
  const secret = process.env.IGDB_CLIENT_SECRET;
  if (!client || !secret) throw new ServiceError('provider_unconfigured', 503);
  const url = new URL('https://id.twitch.tv/oauth2/token');
  url.searchParams.set('client_id', client);
  url.searchParams.set('client_secret', secret);
  url.searchParams.set('grant_type', 'client_credentials');
  const response = z
    .object({ access_token: z.string(), expires_in: z.number() })
    .parse(await requestJson(url, { method: 'POST', cache: 'no-store' }));
  twitchToken = {
    value: response.access_token,
    expiry: Date.now() + (response.expires_in - 60) * 1000,
  };
  return response.access_token;
}
export async function searchProvider(
  input: z.infer<typeof providerInput>
): Promise<ProviderItem[]> {
  if (input.provider === 'tmdb') {
    const key = process.env.TMDB_API_KEY;
    if (!key) throw new ServiceError('provider_unconfigured', 503);
    if (input.kind === 'games') throw new ServiceError('invalid_provider_category', 400);
    const type = input.kind === 'television' ? 'tv' : 'movie';
    const url = new URL(`https://api.themoviedb.org/3/search/${type}`);
    url.searchParams.set('api_key', key);
    url.searchParams.set('query', input.query);
    const result = z
      .object({
        results: z.array(
          z.object({
            id: z.number(),
            title: z.string().optional(),
            name: z.string().optional(),
            release_date: z.string().optional(),
            first_air_date: z.string().optional(),
            original_title: z.string().optional(),
            original_name: z.string().optional(),
          })
        ),
      })
      .parse(await requestJson(url));
    return result.results
      .slice(0, 12)
      .map((item) => ({
        provider: 'tmdb',
        providerId: String(item.id),
        title: item.title || item.name || '',
        year: Number((item.release_date || item.first_air_date || '0').slice(0, 4)),
        category: input.kind,
        sourceUrl: `https://www.themoviedb.org/${type}/${item.id}`,
        aliases: [item.original_title || item.original_name || ''].filter(Boolean),
      }))
      .filter((item) => item.title && item.year >= 1800);
  }
  if (input.kind !== 'games') throw new ServiceError('invalid_provider_category', 400);
  if (input.provider === 'rawg') {
    const key = process.env.RAWG_API_KEY;
    if (!key) throw new ServiceError('provider_unconfigured', 503);
    const url = new URL('https://api.rawg.io/api/games');
    url.searchParams.set('key', key);
    url.searchParams.set('search', input.query);
    url.searchParams.set('page_size', '12');
    const result = z
      .object({
        results: z.array(
          z.object({
            id: z.number(),
            slug: z.string(),
            name: z.string(),
            released: z.string().nullable(),
          })
        ),
      })
      .parse(await requestJson(url));
    return result.results
      .map((item) => ({
        provider: 'rawg',
        providerId: String(item.id),
        title: item.name,
        year: Number(item.released?.slice(0, 4) || '0'),
        category: 'games',
        sourceUrl: `https://rawg.io/games/${item.slug}`,
        aliases: [],
      }))
      .filter((item) => item.year >= 1800);
  }
  const query = input.query.replace(/["\\;\r\n]/g, ' ');
  const data = z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        first_release_date: z.number().optional(),
        url: z.string().optional(),
        alternative_names: z.array(z.object({ name: z.string() })).optional(),
      })
    )
    .parse(
      await requestJson('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': process.env.IGDB_CLIENT_ID!,
          Authorization: `Bearer ${await igdbToken()}`,
        },
        body: `search "${query}"; fields name,first_release_date,url,alternative_names.name; limit 12;`,
      })
    );
  return data
    .map((item) => ({
      provider: 'igdb',
      providerId: String(item.id),
      title: item.name,
      year: item.first_release_date ? new Date(item.first_release_date * 1000).getUTCFullYear() : 0,
      category: 'games',
      sourceUrl: item.url || `https://www.igdb.com/games/${item.id}`,
      aliases: item.alternative_names?.map((alias) => alias.name) || [],
    }))
    .filter((item) => item.year >= 1800);
}
