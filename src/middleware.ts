import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicOrigin } from './lib/utils/url';

import { getSubdomain, isCustomDomain, slugifyGymName } from './lib/utils/domain';

export { getSubdomain, isCustomDomain, slugifyGymName };

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // -------------------------------------------------------------
  // 1. Subdomain Resolution & Custom Domain Rewriting
  // -------------------------------------------------------------
  const subdomain = getSubdomain(host);
  const isCustom = isCustomDomain(host);

  if (subdomain || isCustom) {
    const slugOrDomain = subdomain || host.split(':')[0].toLowerCase();
    // If visitor lands on [gymSlug].localhost:3000 or custom domain (e.g. portal.mygym.com)
    // Root or /join routes get rewritten directly to customer onboarding /join/[slugOrDomain]
    if (pathname === '/' || pathname === '/join') {
      const url = request.nextUrl.clone();
      url.pathname = `/join/${slugOrDomain}`;
      return NextResponse.rewrite(url);
    }
  }

  // -------------------------------------------------------------
  // 1.5. Auth Code Interception (e.g. Supabase OAuth / Magic Link)
  // If Supabase redirects with ?code= to root or any page, route to /auth/callback
  // -------------------------------------------------------------
  const authCode = request.nextUrl.searchParams.get('code');
  if (authCode && !pathname.startsWith('/auth/callback')) {
    const origin = getPublicOrigin(request);
    const callbackUrl = new URL('/auth/callback', origin);
    callbackUrl.searchParams.set('code', authCode);
    const nextParam = request.nextUrl.searchParams.get('next');
    if (nextParam) {
      callbackUrl.searchParams.set('next', nextParam);
    }
    return NextResponse.redirect(callbackUrl);
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
    pathname.startsWith('/qr') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/api/dashboard') ||
    pathname.startsWith('/api/members') ||
    pathname.startsWith('/api/payments') ||
    pathname.startsWith('/api/settings');

  // Let public non-login, non-root routes pass immediately
  if (!isProtectedRoute && pathname !== '/login' && pathname !== '/') {
    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // 3. Authenticate User Session
  // -------------------------------------------------------------
  let isSupabaseAuthenticated = false;
  const isDemoSession = request.cookies.get('gymora_demo_mode')?.value === 'true';
  const hasSessionCookie = request.cookies.get('gymora_session')?.value === 'true';

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
        isSupabaseAuthenticated = true;
      }
    } catch {
      // Fallback seamlessly if Supabase request times out
    }
  }

  const isActuallyAuthenticated = isSupabaseAuthenticated || hasSessionCookie;
  const canAccessDashboard = isActuallyAuthenticated || isDemoSession;

  // -------------------------------------------------------------
  // 4. Route Enforcement & Redirection
  // -------------------------------------------------------------
  if (isProtectedRoute && !canAccessDashboard) {
    const origin = getPublicOrigin(request);
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user visits /login while in demo mode, clear demo cookie so login is 100% clean!
  if (pathname === '/login' && isDemoSession && !isActuallyAuthenticated) {
    response.cookies.delete('gymora_demo_mode');
    return response;
  }

  // ONLY redirect away from /login if user is legitimately authenticated with a real account
  if (pathname === '/login' && isActuallyAuthenticated) {
    const origin = getPublicOrigin(request);
    const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/dashboard';
    return NextResponse.redirect(new URL(returnUrl, origin));
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
