function isNetlify() {
  // SITE_ID is available to Netlify functions even when the build-only NETLIFY flag is absent.
  return Boolean(process.env.NETLIFY || process.env.SITE_ID);
}

export function requestProtocol(request: Request) {
  const hosted = process.env.VERCEL || isNetlify();
  return hosted && request.headers.get('x-forwarded-proto') === 'https'
    ? 'https:'
    : new URL(request.url).protocol;
}

export function clientNetwork(request: Request) {
  if (isNetlify()) return request.headers.get('x-nf-client-connection-ip')?.trim() || 'unknown';
  if (process.env.VERCEL)
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return 'local';
}
