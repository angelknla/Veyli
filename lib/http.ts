import 'server-only';
import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { GameError } from '@/features/game/engine';
import { rpc, ServiceError } from '@/lib/database';
import { reportFailure } from '@/lib/monitoring';
import { clientNetwork, requestProtocol } from '@/lib/request';
export const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' };
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: privateHeaders });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const requestUrl = new URL(request.url);
  const protocol = requestProtocol(request);
  const host = request.headers.get('host') || requestUrl.host;
  const expectedOrigin = new URL(`${protocol}//${host}`).origin;
  if (origin && origin !== expectedOrigin) throw new ServiceError('invalid_origin', 403);
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    throw new ServiceError('invalid_origin', 403);
}
export async function rateLimit(request: Request, operation: string, player?: string) {
  const secret = process.env.ANONYMOUS_COOKIE_SECRET;
  if (!secret) throw new ServiceError('identity_unconfigured');
  const network = clientNetwork(request);
  const digest = createHmac('sha256', secret).update(`veyli:network:${network}`).digest('hex');
  const allowed = await rpc('veyli_take_rate', {
    rate_key: `${operation}:${digest}`,
    maximum: operation === 'guess' ? 60 : 180,
    window_seconds: 60,
  });
  if (!allowed) throw new ServiceError('rate_limited', 429);
  if (
    player &&
    !(await rpc('veyli_take_rate', {
      rate_key: `${operation}:player:${player}`,
      maximum: operation === 'guess' ? 20 : 120,
      window_seconds: 60,
    }))
  )
    throw new ServiceError('rate_limited', 429);
}
export function apiError(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError)
    return json({ error: 'invalid_request' }, 400);
  if (error instanceof GameError)
    return json({ error: error.code }, error.code === 'challenge_unavailable' ? 404 : 409);
  if (error instanceof ServiceError) {
    const response = json({ error: error.code }, error.status);
    if (error.status === 429) response.headers.set('Retry-After', '60');
    return response;
  }
  const id = reportFailure('unexpected', 'api');
  return json({ error: 'temporarily_unavailable', requestId: id }, 503);
}
