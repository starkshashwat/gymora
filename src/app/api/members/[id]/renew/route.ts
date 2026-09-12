import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';
import { createClient } from '@/lib/supabase/server';
import { resolveCurrentGym, renewMemberInDatabase } from '@/lib/data/dbSync';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { gymId, user } = await resolveCurrentGym(request, supabase);

    if (!gymId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or gym not identified' },
        { status: 401 }
      );
    }

    const memberId = params.id;
    const memberData = gymService.getMemberById(memberId, gymId);
    if (!memberData || !memberData.member) {
      return NextResponse.json(
        { success: false, error: 'Member not found in your gym' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { plan_id, amount_paid, payment_method, notes, start_date } = body;

    if (!plan_id) {
      return NextResponse.json(
        { success: false, error: 'Membership plan is required for renewal' },
        { status: 400 }
      );
    }

    const result = await renewMemberInDatabase(
      {
        member_id: memberId,
        plan_id,
        amount_paid: Number(amount_paid || 0),
        payment_method: payment_method || 'cash',
        notes: notes?.trim(),
        start_date,
      },
      gymId,
      supabase,
      user
    );

    return NextResponse.json({
      success: true,
      message: `Membership successfully renewed for ${result.member.full_name}!`,
      member: result.member,
      membership: result.membership,
      payment: result.payment,
    });
  } catch (error: any) {
    console.error('Error in member renewal route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
