import { NextResponse, NextRequest } from 'next/server';
import { gymService } from '@/lib/data/service';
import { isDueToday } from '@/lib/utils/date';
import { createClient } from '@/lib/supabase/server';
import { initialGym } from '@/lib/data/mockDb';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isDemoCookie = request.cookies.get('gymora_demo_mode')?.value === 'true';
    const gymCookie = request.cookies.get('gymora_gym_id')?.value;
    const sessionCookie = request.cookies.get('gymora_session')?.value === 'true';

    // A visitor is ONLY demo if NOT a real user and holding the demo cookie
    const isDemoVisitor = !user && isDemoCookie;

    if (!user && !isDemoVisitor && !sessionCookie && !gymCookie) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let gymId: string | undefined = undefined;

    if (isDemoVisitor) {
      // Demo visitor gets the mock demo gym (Iron Pulse / Gymora demo data)
      gymId = initialGym.id;
    } else {
      // Real authenticated user or email session
      // 1. Check user_metadata (ignore if demo gym was mistakenly attached)
      if (user?.user_metadata?.gym_id && user.user_metadata.gym_id !== initialGym.id) {
        gymId = user.user_metadata.gym_id;
      }

      // 2. Check in-memory user map
      if (!gymId && user) {
        const memGym = gymService.getUserGym(user.id);
        if (memGym && memGym !== initialGym.id) {
          gymId = memGym;
        }
      }

      // 3. Check profiles table in Supabase
      if (!gymId && user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('gym_id')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.gym_id && profile.gym_id !== initialGym.id) {
            gymId = profile.gym_id;
          }
        } catch {}
      }

      // 4. Check cookie fallback
      if (!gymId && gymCookie && gymCookie !== initialGym.id) {
        gymId = gymCookie;
      }

      // Real owner has not completed onboarding yet -> MUST complete onboarding!
      if (!gymId) {
        return NextResponse.json({ success: false, requireOnboarding: true }, { status: 200 });
      }
    }

    let metrics;
    let allMembers;
    let gym;
    let pendingRegistrations;

    try {
      gym = gymService.getGym(gymId);
      metrics = gymService.getDashboardMetrics(gymId);
      allMembers = gymService.getMembersWithDetails(gymId);
      pendingRegistrations = gymService.getRegistrations(gymId).filter((r) => r.status === 'pending');
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
