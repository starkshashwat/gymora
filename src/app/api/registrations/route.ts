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

    const members = gymService.getMembersWithDetails(gymId, '', 'all', 1, 99999).members;
    const enriched = registrations.map((r: any) => {
      let converted_member_id = r.converted_member_id;
      if (!converted_member_id && r.status === 'converted') {
        const found = members.find((m: any) => m.phone === r.phone || (r.email && m.email === r.email));
        if (found) converted_member_id = found.id;
      }
      return {
        ...r,
        converted_member_id: converted_member_id || null,
      };
    });

    return NextResponse.json({ success: true, isDemoMode, registrations: enriched });
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
      idempotency_key,
    } = body;

    if (!registration_id) {
      return NextResponse.json(
        { success: false, error: 'registration_id is required' },
        { status: 400 }
      );
    }

    const safeIdempotencyKey = idempotency_key || `reg_${registration_id}_${Date.now()}`;

    const result = await approveRegistrationInDatabase(
      {
        registration_id,
        payment_received: Boolean(payment_received),
        amount_received: Number(amount_received || 0),
        payment_method: payment_method || 'cash',
        notes: notes?.trim() || undefined,
        idempotency_key: safeIdempotencyKey,
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
