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
        // 1. Persist directly to Supabase Auth user_metadata (always works without RLS blocks)
        await supabase.auth.updateUser({
          data: {
            gym_id: result.gym_id,
            gym_slug: result.gym_slug,
            gym_name: body.gym_name,
            has_onboarded: true,
          },
        });

        // 2. Associate user with gym in-memory
        gymService.setUserGym(user.id, result.gym_id);

        // 3. Best-effort update to profiles table
        try {
          await supabase.from('profiles').upsert({
            id: user.id,
            gym_id: result.gym_id,
            role: 'owner',
            full_name: `${body.gym_name} Owner`,
          });
        } catch {
          // Ignore RLS constraint errors if profiles table has no insert policy
        }
      }
    } catch (err) {
      console.error("Supabase connection error during onboarding:", err);
    }

    const response = NextResponse.json(result, { status: 201 });
    response.cookies.delete('gymora_demo_mode');
    if (result.gym_id) {
      response.cookies.set({
        name: 'gymora_gym_id',
        value: result.gym_id,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      });
      response.cookies.set({
        name: 'gymora_session',
        value: 'true',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete gym onboarding' },
      { status: 500 }
    );
  }
}
