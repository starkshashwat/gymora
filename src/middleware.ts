import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Extracts gym slug subdomain from the incoming Host header.
 * Supports:
 * - Localhost development: [slug].localhost:3000 or [slug].localhost
 * - Production: [slug].gymora.fit
 * Ignores reserved subdomains like www, app, api, admin.
 */
function getSubdomain(host: string): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0].toLowerCase();

  // If host is localhost or raw IP address (e.g. 127.0.0.1), no subdomain
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  // Localhost pattern: e.g. "iron-pulse.localhost"
  if (hostname.endsWith('.localhost')) {
    const sub = hostname.replace('.localhost', '');
    if (sub && !['www', 'app', 'api', 'admin'].includes(sub)) {
      return sub;
    }
  }

  // Production domain pattern: e.g. "iron-pulse.gymora.fit"
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub && !['www', 'app', 'api', 'admin'].includes(sub)) {
      return sub;
    }
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // -------------------------------------------------------------
  // 1. Subdomain Resolution & Rewriting
  // -------------------------------------------------------------
  const subdomain = getSubdomain(host);
  if (subdomain) {
    // If visitor lands on [gymSlug].localhost:3000 or [gymSlug].gymora.fit
    // Root or /join routes get rewritten directly to customer onboarding /join/[gymSlug]
    if (pathname === '/' || pathname === '/join') {
      const url = request.nextUrl.clone();
      url.pathname = `/join/${subdomain}`;
      return NextResponse.rewrite(url);
    }
  }

  // -------------------------------------------------------------
  // 2. Define Public vs. Protected Routes
  // -------------------------------------------------------------
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/registrations') ||
    pathname.startsWith('/api/onboarding') ||
    pathname.startsWith('/api/plans') ||
    pathname.startsWith('/api/join') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.');

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/members') ||
    pathname.startsWith('/plans') ||
    pathname.startsWith('/registrations') ||
    pathname.startsWith('/qr');

  // Let public non-login, non-root routes pass immediately
  if (!isProtectedRoute && pathname !== '/login' && pathname !== '/') {
    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // 3. Authenticate User Session
  // -------------------------------------------------------------
  let isAuthenticated = false;

  // Rapid check: Gymora session cookie
  const demoCookie = request.cookies.get('gymora_session');
  if (demoCookie && demoCookie.value === 'true') {
    isAuthenticated = true;
  }

  // Supabase Auth SSR verification
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        isAuthenticated = true;
      }
    } catch {
      // Fallback seamlessly if Supabase request times out
    }
  }

  // -------------------------------------------------------------
  // 4. Route Enforcement & Redirection
  // -------------------------------------------------------------
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && isAuthenticated) {
    const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/dashboard';
    return NextResponse.redirect(new URL(returnUrl, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files & internal assets
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
