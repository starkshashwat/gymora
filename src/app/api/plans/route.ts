import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';
import { createClient } from '@/lib/supabase/server';
import { resolveCurrentGym } from '@/lib/data/dbSync';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { gymId } = await resolveCurrentGym(request, supabase);

    const plans = gymService.getPlans(gymId);
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { gymId, user } = await resolveCurrentGym(request, supabase);

    const body = await request.json();
    const { id, name, duration_days, price, description, is_active } = body;

    if (!name || duration_days === undefined || price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name, duration, and price are required' },
        { status: 400 }
      );
    }

    const savedPlan = gymService.savePlan(
      {
        id,
        name,
        duration_days: Number(duration_days),
        price: Number(price),
        description,
        is_active,
      },
      gymId
    );

    // If authenticated in Supabase, also sync to Supabase membership_plans
    if (user && gymId && supabase) {
      try {
        await supabase.from('membership_plans').upsert({
          id: savedPlan.id,
          gym_id: gymId,
          name: savedPlan.name,
          duration_days: savedPlan.duration_days,
          price: savedPlan.price,
          description: savedPlan.description,
          is_active: savedPlan.is_active,
        });
      } catch (err) {
        console.warn('Supabase plan upsert warning:', err);
      }
    }

    return NextResponse.json({ success: true, plan: savedPlan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
