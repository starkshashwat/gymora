import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';

export async function GET() {
  try {
    const registrations = gymService.getRegistrations();
    return NextResponse.json({ success: true, registrations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { registration_id, start_date } = body;

    if (!registration_id) {
      return NextResponse.json(
        { success: false, error: 'registration_id is required' },
        { status: 400 }
      );
    }

    const result = gymService.convertRegistrationToMember(registration_id, start_date);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
