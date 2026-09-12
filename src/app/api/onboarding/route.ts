import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';
import { OnboardingPayload } from '@/lib/types/database';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body: OnboardingPayload = await request.json();

    if (!body.gym_name || !body.phone) {
      return NextResponse.json(
        { success: false, error: 'Gym name and phone number are required.' },
        { status: 400 }
      );
    }

    const result = gymService.onboardGymOwner(body);

    // If a Supabase user is authenticated, link their profile to this newly created gym
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && result.gym_id) {
        await supabase.from('profiles').upsert({
          id: user.id,
          gym_id: result.gym_id,
          email: user.email,
          role: 'owner',
          full_name: `${body.gym_name} Owner`,
        });
      }
    } catch {
      // Resilient fallback if table does not exist yet
    }

    const response = NextResponse.json(result, { status: 201 });
    // Set 30-day session cookie for edge middleware authorization
    response.cookies.set('gymora_session', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete gym onboarding' },
      { status: 500 }
    );
  }
}
