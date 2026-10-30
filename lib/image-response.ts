import 'server-only';

import { createHash } from 'node:crypto';

/** Call only after checking availability or player/admin access, including on revalidation. */
export function imageResponse(
  request: Request,
  buffer: Buffer,
  audience: 'public' | 'player' | 'admin'
) {
  const etag = `"${createHash('sha256').update(buffer).digest('hex')}"`;
  const headers = {
    'Content-Type': 'image/jpeg',
    'Cache-Control':
      audience === 'public' ? 'public, max-age=60, must-revalidate' : 'private, no-cache',
    ETag: etag,
    ...(audience === 'player'
      ? { Vary: 'Cookie' }
      : audience === 'admin'
        ? { Vary: 'Authorization, Cookie' }
        : {}),
  };
  if (
    request.headers
      .get('if-none-match')
      ?.split(',')
      .some((value) => value.trim().replace(/^W\//, '') === etag)
  )
    return new Response(null, { status: 304, headers });
  return new Response(new Uint8Array(buffer), { headers });
}
