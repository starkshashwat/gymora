import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';
import { PaymentMethod } from '@/lib/types/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { member_id, membership_id, amount, payment_method, notes } = body;

    if (!member_id || !membership_id || !amount || !payment_method) {
      return NextResponse.json(
        { success: false, error: 'Member, membership, amount, and payment method are required' },
        { status: 400 }
      );
    }

    const result = gymService.recordPayment({
      member_id,
      membership_id,
      amount: Number(amount),
      payment_method: payment_method as PaymentMethod,
      notes,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
