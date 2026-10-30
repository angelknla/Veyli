import { type NextRequest, NextResponse } from 'next/server';
import { verifyAdminHeader } from '@/lib/security/token';
export function proxy(request: NextRequest) {
  if (!process.env.ADMIN_ACCESS_KEY || process.env.ADMIN_ACCESS_KEY.length < 24)
    return new NextResponse('Administration is not configured.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  if (
    process.env.NODE_ENV === 'production' &&
    request.nextUrl.protocol !== 'https:' &&
    !(process.env.VERCEL && request.headers.get('x-forwarded-proto') === 'https')
  )
    return new NextResponse('Administrative access requires HTTPS.', { status: 403 });
  if (!verifyAdminHeader(request.headers.get('authorization'), process.env.ADMIN_ACCESS_KEY))
    return new NextResponse('Protected Veyli administration.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Veyli administration", charset="UTF-8"',
        'Cache-Control': 'no-store',
      },
    });
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
