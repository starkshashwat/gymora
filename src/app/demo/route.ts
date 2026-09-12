import { NextResponse } from 'next/server';
import { getPublicOrigin } from '@/lib/utils/url';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const origin = getPublicOrigin(request);
  const dashboardUrl = new URL('/dashboard', origin);

  const response = NextResponse.redirect(dashboardUrl);
  
  // Set the sandboxed demo cookie
  response.cookies.set({
    name: 'gymora_demo_mode',
    value: 'true',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
  });

  return response;
}
