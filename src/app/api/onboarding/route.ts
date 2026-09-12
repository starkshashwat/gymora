import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';
import { OnboardingPayload } from '@/lib/types/database';

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

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete gym onboarding' },
      { status: 500 }
    );
  }
}
