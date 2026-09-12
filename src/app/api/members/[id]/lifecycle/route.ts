import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';
import { createClient } from '@/lib/supabase/server';
import {
  resolveCurrentGym,
  cancelMembershipInDatabase,
  pauseMembershipInDatabase,
  reactivateMembershipInDatabase,
} from '@/lib/data/dbSync';

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
    const { action, reason, membership_id } = body;

    if (!action || !['pause', 'cancel', 'reactivate'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Valid action (pause, cancel, reactivate) is required' },
        { status: 400 }
      );
    }

    // Determine target membership
    const targetMembershipId =
      membership_id ||
      memberData.member.membership?.id;

    if (!targetMembershipId) {
      return NextResponse.json(
        { success: false, error: 'No active or target membership found for this member' },
        { status: 400 }
      );
    }

    let result: any;
    if (action === 'pause') {
      result = await pauseMembershipInDatabase(targetMembershipId, gymId, supabase, user);
    } else if (action === 'cancel') {
      result = await cancelMembershipInDatabase(targetMembershipId, reason, gymId, supabase, user);
    } else if (action === 'reactivate') {
      result = await reactivateMembershipInDatabase(targetMembershipId, gymId, supabase, user);
    }

    // Fetch updated member data
    const updated = gymService.getMemberById(memberId, gymId);

    return NextResponse.json({
      success: true,
      action,
      message: `Membership successfully ${action}d`,
      member: updated?.member,
      membership: result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
