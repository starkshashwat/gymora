import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dashboardUrl = new URL('/dashboard', url.origin);

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
