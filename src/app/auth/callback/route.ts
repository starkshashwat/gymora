import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('gym_id')
            .eq('id', user.id)
            .single();

          if (!profile || !profile.gym_id) {
            return NextResponse.redirect(`${origin}/onboarding`);
          }
        }
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (e) {
      // Fallback
    }
  }

  return NextResponse.redirect(`${origin}/onboarding`);
}
