import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { clientNetwork, requestProtocol } from './request';

beforeEach(() => {
  for (const key of ['VERCEL', 'NETLIFY', 'SITE_ID']) vi.stubEnv(key, '');
});
afterEach(() => vi.unstubAllEnvs());

const request = (ip = '203.0.113.1') =>
  new Request('http://veyli.example/api/hub', {
    headers: {
      'x-nf-client-connection-ip': ip,
      'x-forwarded-for': '198.51.100.1, 198.51.100.2',
      'x-forwarded-proto': 'https',
    },
  });

it('separates Netlify visitors using its platform header at build time and runtime', () => {
  vi.stubEnv('SITE_ID', 'netlify-runtime-site');
  expect(clientNetwork(request())).toBe('203.0.113.1');
  expect(clientNetwork(request('203.0.113.2'))).toBe('203.0.113.2');
  expect(requestProtocol(request())).toBe('https:');
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('NETLIFY', 'true');
  expect(clientNetwork(request())).toBe('203.0.113.1');
});

it('preserves Vercel forwarded headers', () => {
  vi.stubEnv('VERCEL', '1');
  expect(clientNetwork(request())).toBe('198.51.100.1');
  expect(requestProtocol(request())).toBe('https:');
});

it('ignores forwarded headers outside a supported hosting platform', () => {
  expect(clientNetwork(request())).toBe('local');
  expect(requestProtocol(request())).toBe('http:');
});
