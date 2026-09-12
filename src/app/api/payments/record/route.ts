import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCurrentGym, recordPaymentInDatabase } from '@/lib/data/dbSync';
import { PaymentMethod } from '@/lib/types/database';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { gymId, user } = await resolveCurrentGym(request, supabase);

    const body = await request.json();
    const { member_id, membership_id, amount, payment_method, notes } = body;

    if (!member_id || !membership_id || !amount || !payment_method) {
      return NextResponse.json(
        { success: false, error: 'Member, membership, amount, and payment method are required' },
        { status: 400 }
      );
    }

    if (Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Payment amount must be greater than zero' },
        { status: 400 }
      );
    }

    const activeGymId = gymId || 'gym-gymora-01';

    const result = await recordPaymentInDatabase(
      {
        member_id,
        membership_id,
        amount: Number(amount),
        payment_method: payment_method as PaymentMethod,
        notes,
      },
      activeGymId,
      supabase,
      user
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
