import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';
import { createClient } from '@/lib/supabase/server';
import { resolveCurrentGym, saveMemberToDatabase } from '@/lib/data/dbSync';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { gymId, isDemoMode, isCrossTenantForbidden } = await resolveCurrentGym(request, supabase);
    if (isCrossTenantForbidden) {
      return NextResponse.json({ success: false, error: 'Access Denied: You do not have permission to access this gym.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const filter = (searchParams.get('filter') || 'all') as import('@/lib/types/database').MemberFilterType;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!gymId && !isDemoMode) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { members, totalCount } = gymService.getMembersWithDetails(gymId, query, filter, page, limit);
    return NextResponse.json({ success: true, isDemoMode, members, totalCount });
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
        { success: false, error: 'No active gym found for this account. Please complete onboarding.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { full_name, phone, email, plan_id, start_date } = body;

    if (!full_name || !phone || !plan_id) {
      return NextResponse.json(
        { success: false, error: 'Full name, phone, and membership plan are required' },
        { status: 400 }
      );
    }

    const result = await saveMemberToDatabase(
      {
        full_name,
        phone,
        email,
        plan_id,
        start_date,
      },
      gymId,
      supabase,
      user
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
