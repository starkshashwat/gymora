import { NextResponse, NextRequest } from 'next/server';
import { gymService } from '@/lib/data/service';
import { isDueToday, isExpiringSoon } from '@/lib/utils/date';
import { createClient } from '@/lib/supabase/server';
import { resolveCurrentGym } from '@/lib/data/dbSync';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { gymId, isDemoMode, user, isCrossTenantForbidden } = await resolveCurrentGym(request, supabase);

    if (isCrossTenantForbidden) {
      return NextResponse.json(
        { success: false, error: 'Access Denied: You do not have permission to access this gym dashboard.' },
        { status: 403 }
      );
    }

    if (!gymId && !isDemoMode) {
      const hasSession = request.cookies.get('gymora_session')?.value === 'true';
      if (hasSession) {
        return NextResponse.json({ success: false, requireOnboarding: true }, { status: 200 });
      }
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isDemoVisitor = isDemoMode;

    let metrics;
    let allMembers;
    let gym;
    let pendingRegistrations;

    try {
      gym = gymService.getGym(gymId);
      metrics = gymService.getDashboardMetrics(gymId);
      allMembers = gymService.getMembersWithDetails(gymId);
      pendingRegistrations = gymService.getRegistrations(gymId).filter((r) => r.status === 'pending');

      // Check Supabase for new registrations submitted from other devices
      if (gymId && !isDemoVisitor) {
        try {
          const { data: dbPending } = await supabase
            .from('registration_requests')
            .select('*')
            .eq('gym_id', gymId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

          if (dbPending && dbPending.length > 0) {
            pendingRegistrations = dbPending;
          }
        } catch (dbErr) {
          console.warn('Supabase dashboard pending registrations query error:', dbErr);
        }
      }
    } catch (e: any) {
      if (e.message.includes('Gym not found')) {
        return NextResponse.json({ success: false, requireOnboarding: true }, { status: 403 });
      }
      throw e;
    }

    // Due today list
    const dueToday = allMembers.filter(
      (m) =>
        m.membership &&
        m.membership.outstanding_balance > 0 &&
        isDueToday(m.membership.due_date)
    );

    // Overdue list
    const overdue = allMembers.filter(
      (m) =>
        m.membership &&
        m.membership.outstanding_balance > 0 &&
        m.membership.is_overdue
    );

    // Expiring soon list (next 7 days)
    const expiringSoon = allMembers.filter(
      (m) =>
        m.membership &&
        m.membership.lifecycle === 'active' &&
        isExpiringSoon(m.membership.end_date, 7)
    );

    // Recent payments (top 5)
    // Filter payments manually since gymService.payments is raw global array.
    const gymPayments = gymService.payments.filter((p) => p.gym_id === gym.id);
    const recentPayments = gymPayments.slice(0, 6).map((p) => {
      const mem = allMembers.find((m) => m.id === p.member_id);
      return {
        ...p,
        member_name: mem?.full_name || 'Member',
      };
    });

    const response = NextResponse.json({
      success: true,
      isDemoMode: !user,
      gym,
      metrics,
      dueToday,
      overdue,
      expiringSoon,
      recentPayments,
      pendingRegistrations,
    });

    if (gymId && user) {
      response.cookies.set({
        name: 'gymora_gym_id',
        value: gymId,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      });
      response.cookies.set({
        name: 'gymora_session',
        value: 'true',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
