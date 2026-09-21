import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth/config';
import { corsHeaders, resolveAllowedOrigin } from '@/lib/auth/cors';

const PROTECTED_PREFIXES = ['/profile', '/admin', '/member', '/leader', '/volunteer'];
const PRIVATE_NO_STORE_PREFIXES = [
  '/member',
  '/admin',
  '/leader',
  '/volunteer',
  '/profile',
  '/api/v1/member',
  '/api/v1/members/me',
  '/api/v1/leader',
  '/api/v1/giving/my',
  '/api/v1/prayer/my',
  '/api/v1/attendance/my',
  '/api/v1/auth/me',
];

function applyPrivateHeaders(response: NextResponse, pathname: string) {
  const isPrivate = PRIVATE_NO_STORE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isPrivate) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

function applyCors(request: NextRequest, response: NextResponse) {
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    response.headers.set(key, value);
  }
  return applyPrivateHeaders(response, request.nextUrl.pathname);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const sameOrigin = origin === request.nextUrl.origin;
    if (origin && !sameOrigin && !resolveAllowedOrigin(origin)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Origin not allowed',
          errors: null,
        },
        { status: 403 }
      );
    }

    if (request.method === 'OPTIONS') {
      return applyCors(request, new NextResponse(null, { status: 204 }));
    }

    return applyCors(request, NextResponse.next());
  }

  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    loginUrl.searchParams.set('reason', 'auth');
    return NextResponse.redirect(loginUrl);
  }

  return applyPrivateHeaders(NextResponse.next(), pathname);
}

export const config = {
  matcher: [
    '/api/:path*',
    '/profile',
    '/profile/:path*',
    '/admin',
    '/admin/:path*',
    '/member',
    '/member/:path*',
    '/leader',
    '/leader/:path*',
    '/volunteer',
    '/volunteer/:path*',
  ],
};
