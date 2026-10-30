import 'server-only';
import { cookies } from 'next/headers';
import { issueToken, verifyToken } from './token';
export async function playerIdentity(create = true): Promise<string | null> {
  const secret = process.env.ANONYMOUS_COOKIE_SECRET;
  if (!secret || secret.length < 32) throw new Error('identity_unconfigured');
  const jar = await cookies();
  const name = process.env.NODE_ENV === 'production' ? '__Host-veyli_player' : 'veyli_player';
  const verified = verifyToken(jar.get(name)?.value, secret);
  if (verified || !create) return verified;
  const token = issueToken(secret);
  jar.set(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 365 * 86400,
  });
  return verifyToken(token, secret);
}
