import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';
import { createClient } from '@/lib/supabase/server';
import { resolveCurrentGym, approveRegistrationInDatabase } from '@/lib/data/dbSync';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { gymId, isDemoMode, isCrossTenantForbidden } = await resolveCurrentGym(request, supabase);

    if (isCrossTenantForbidden) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: You do not have permission to access this gym.' },
        { status: 403 }
      );
    }

    if (!gymId && !isDemoMode) {
      return NextResponse.json({ success: true, registrations: [] });
    }

    let registrations = gymService.getRegistrations(gymId);

    // Query Supabase for latest registrations across devices
    if (gymId && !isDemoMode) {
      try {
        const { data: dbRegs } = await supabase
          .from('registration_requests')
          .select('*')
          .eq('gym_id', gymId)
          .order('created_at', { ascending: false });

        if (dbRegs && dbRegs.length > 0) {
          registrations = dbRegs;
        }
      } catch (dbErr) {
        console.warn('Supabase getRegistrations query error:', dbErr);
      }
    }

    return NextResponse.json({ success: true, isDemoMode, registrations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { gymId, user, isCrossTenantForbidden } = await resolveCurrentGym(request, supabase);

    if (isCrossTenantForbidden) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: You do not have permission to access this gym.' },
        { status: 403 }
      );
    }

    if (!gymId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or gym not found' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      registration_id,
      payment_received,
      amount_received,
      payment_method,
      notes,
    } = body;

    if (!registration_id) {
      return NextResponse.json(
        { success: false, error: 'registration_id is required' },
        { status: 400 }
      );
    }

    const result = await approveRegistrationInDatabase(
      {
        registration_id,
        payment_received: Boolean(payment_received),
        amount_received: Number(amount_received || 0),
        payment_method: payment_method || 'cash',
        notes: notes?.trim() || undefined,
      },
      gymId,
      supabase,
      user
    );

    return NextResponse.json({
      success: true,
      message: 'Registration approved and member created successfully',
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
