import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';

export async function GET() {
  try {
    const plans = gymService.getPlans();
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, duration_days, price, description, is_active } = body;

    if (!name || duration_days === undefined || price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name, duration, and price are required' },
        { status: 400 }
      );
    }

    const savedPlan = gymService.savePlan({
      id,
      name,
      duration_days: Number(duration_days),
      price: Number(price),
      description,
      is_active,
    });

    return NextResponse.json({ success: true, plan: savedPlan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
