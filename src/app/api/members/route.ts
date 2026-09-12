import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const filter = (searchParams.get('filter') || 'all') as 'all' | 'paid' | 'due' | 'overdue';

    const members = gymService.getMembersWithDetails(undefined, query, filter);
    return NextResponse.json({ success: true, members });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { full_name, phone, email, plan_id, start_date } = body;

    if (!full_name || !phone || !plan_id) {
      return NextResponse.json(
        { success: false, error: 'Full name, phone, and plan are required' },
        { status: 400 }
      );
    }

    const newMember = gymService.addMember({
      full_name,
      phone,
      email,
      plan_id,
      start_date,
    });

    return NextResponse.json({ success: true, member: newMember }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
