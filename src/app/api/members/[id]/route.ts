import { NextRequest, NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';
import { createClient } from '@/lib/supabase/server';
import { resolveCurrentGym, deleteMemberFromDatabase } from '@/lib/data/dbSync';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { gymId } = await resolveCurrentGym(request, supabase);

    const data = gymService.getMemberById(params.id, gymId);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
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
    if (!memberData) {
      return NextResponse.json(
        { success: false, error: 'Member not found in your gym' },
        { status: 404 }
      );
    }

    const result = await deleteMemberFromDatabase(memberId, gymId, supabase, user);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_from_db: result.deleted_from_db,
      message: 'Member deleted from database successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
