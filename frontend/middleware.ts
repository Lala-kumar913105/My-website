import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'access_token';

const PROTECTED_PREFIXES = [
  '/add-product',
  '/profile',
  '/my-products',
  '/seller-dashboard',
  '/booking-management',
  '/my-orders',
  '/my-bookings',
  '/cart',
  '/checkout',
];

const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${search || ''}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/add-product/:path*',
    '/profile/:path*',
    '/my-products/:path*',
    '/seller-dashboard/:path*',
    '/booking-management/:path*',
    '/my-orders/:path*',
    '/my-bookings/:path*',
    '/cart/:path*',
    '/checkout/:path*',
  ],
};
