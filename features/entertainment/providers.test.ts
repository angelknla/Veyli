import { afterEach, expect, it, vi } from 'vitest';
import { searchProvider } from './providers';

vi.mock('server-only', () => ({}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('keeps IGDB credentials out of URLs and shares cached tokens across game searches', async () => {
  vi.stubEnv('IGDB_CLIENT_ID', 'test-client-id');
  vi.stubEnv('IGDB_CLIENT_SECRET', 'test-client-secret');
  let tokenRequests = 0;
  const fetch = vi.fn(async (url: string | URL, options: RequestInit) => {
    if (new URL(url).hostname === 'id.twitch.tv') {
      tokenRequests++;
      expect(new URL(url).search).toBe('');
      expect(options.cache).toBe('no-store');
      expect((options.body as URLSearchParams).get('client_secret')).toBe('test-client-secret');
      return Response.json({ access_token: 'test-access-token', expires_in: 3600 });
    }
    expect(options.headers).toMatchObject({
      'Client-ID': 'test-client-id',
      Authorization: 'Bearer test-access-token',
    });
    return Response.json([
      {
        id: 1,
        name: 'Portal',
        first_release_date: 1191888000,
        alternative_names: [{ name: 'Alternative title' }],
      },
    ]);
  });
  vi.stubGlobal('fetch', fetch);
  const input = { provider: 'igdb' as const, kind: 'games' as const, query: 'Portal' };
  const results = await Promise.all([searchProvider(input), searchProvider(input)]);
  expect(results[0][0]).toMatchObject({
    provider: 'igdb',
    category: 'games',
    title: 'Portal',
    aliases: ['Alternative title'],
  });
  await searchProvider(input);
  expect(tokenRequests).toBe(1);
  expect(fetch).toHaveBeenCalledTimes(4);
});
