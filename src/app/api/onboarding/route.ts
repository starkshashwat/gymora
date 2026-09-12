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

        // 3. Persist gym to Supabase gyms table
        try {
          await supabase.from('gyms').upsert({
            id: result.gym_id,
            name: body.gym_name.trim(),
            slug: result.gym_slug,
            phone: body.phone,
            email: body.email?.trim() || null,
            address: body.address?.trim() || null,
            logo_url: body.logo_url?.trim() || null,
            payment_mode: body.payment_mode || 'local_qr',
            upi_id: body.upi_id?.trim() || null,
            whatsapp_mode: body.whatsapp_mode || 'local_click_to_chat',
          });
        } catch (gymErr) {
          console.warn("Could not insert gym to Supabase table:", gymErr);
        }

        // 3.5 Persist initial plans to Supabase membership_plans table
        if (body.plans && body.plans.length > 0) {
          try {
            const plansToInsert = body.plans.map((p) => ({
              gym_id: result.gym_id,
              name: p.name,
              duration_days: p.duration_days,
              price: p.price,
              description: p.description || null,
              image_url: p.image_url || null,
              features: p.features || [],
              is_active: true,
            }));
            await supabase.from('membership_plans').insert(plansToInsert);
          } catch (planErr) {
            console.warn("Could not insert plans to Supabase:", planErr);
          }
        }

        // 4. Update profiles table
        try {
          await supabase.from('profiles').upsert({
            id: user.id,
            gym_id: result.gym_id,
            role: 'owner',
            full_name: `${body.gym_name} Owner`,
          });
        } catch (profileErr) {
          console.warn("Could not upsert profile to Supabase table:", profileErr);
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
