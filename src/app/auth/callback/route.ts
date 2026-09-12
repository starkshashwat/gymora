import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  let targetUrl = `${origin}/onboarding`;

  if (code) {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check if gym owner already has a gym assigned
          const { data: profile } = await supabase
            .from('profiles')
            .select('gym_id')
            .eq('id', user.id)
            .maybeSingle();

          if (profile && profile.gym_id) {
            // Returning gym owner with active gym -> send straight to Dashboard!
            targetUrl = `${origin}${next}`;
          } else {
            // Fresh user without a gym -> start 5-Step Onboarding!
            targetUrl = `${origin}/onboarding`;
          }
        }
      }
    } catch (e) {
      console.warn('Auth callback exchange fallback:', e);
    }
  }

  const response = NextResponse.redirect(targetUrl);
  // Set session cookie for fast client/middleware synchronization
  response.cookies.set('gymora_session', 'true', {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
  });

  return response;
}
