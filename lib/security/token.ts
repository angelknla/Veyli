import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const signature = (payload: string, secret: string) =>
  createHmac('sha256', secret).update(`veyli:anonymous:${payload}`).digest('base64url');
export function issueToken(secret: string, now = Date.now()): string {
  const payload = `${randomBytes(32).toString('base64url')}.${Math.floor(now / 1000) + 365 * 86400}`;
  return `${payload}.${signature(payload, secret)}`;
}
export function verifyToken(
  token: string | undefined,
  secret: string,
  now = Date.now()
): string | null {
  if (!token || token.length > 180) return null;
  const [id, expiry, signed, extra] = token.split('.');
  if (
    extra ||
    !id ||
    !/^[a-zA-Z0-9_-]{43}$/.test(id) ||
    !expiry ||
    !/^\d{10}$/.test(expiry) ||
    !signed ||
    !/^[a-zA-Z0-9_-]{43}$/.test(signed)
  )
    return null;
  if (
    Number(expiry) <= Math.floor(now / 1000) ||
    Number(expiry) > Math.floor(now / 1000) + 366 * 86400
  )
    return null;
  const expected = Buffer.from(signature(`${id}.${expiry}`, secret));
  const received = Buffer.from(signed);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return createHmac('sha256', secret).update(`veyli:player:${id}`).digest('hex');
}
export function verifyAdminHeader(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 24 || !header?.startsWith('Basic ') || header.length > 600)
    return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  if (!decoded.startsWith('admin:')) return false;
  const supplied = createHmac('sha256', secret).update(decoded.slice(6)).digest();
  const expected = createHmac('sha256', secret).update(secret).digest();
  return timingSafeEqual(supplied, expected);
}
