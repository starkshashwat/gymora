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
    let dueToday = [];
    let overdue = [];
    let expiringSoon = [];
    let recentPayments = [];
    let pendingRegistrations = [];
    let gym;

    gym = gymService.getGym(gymId);

    if (user && supabase) {
      try {
        // 1. Metrics via RPC
        const { data: dbMetrics } = await supabase.rpc('get_dashboard_metrics', { p_gym_id: gymId });
        if (dbMetrics) metrics = dbMetrics;

        // 2. Pending registrations
        const { data: dbPending } = await supabase
          .from('registration_requests')
          .select('*')
          .eq('gym_id', gymId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (dbPending) pendingRegistrations = dbPending;

        // 3. Recent payments with member info
        const { data: dbPayments } = await supabase
          .from('payments')
          .select('*, members(full_name)')
          .eq('gym_id', gymId)
          .eq('status', 'paid')
          .order('paid_at', { ascending: false })
          .limit(6);
        
        if (dbPayments) {
          recentPayments = dbPayments.map((p: any) => ({
            ...p,
            member_name: p.members?.full_name || 'Member',
          }));
        }

        // We fetch the lists from gymService for now if we don't write huge SQL views, 
        // but let's strictly limit the memory fetch to active only to avoid N+1 crash.
        // Or better, fetch lists via db queries.
        
        // Due today
        const todayStr = new Date().toISOString().slice(0, 10);
        const { data: dbDueToday } = await supabase
          .from('memberships')
          .select('*, members(*)')
          .eq('gym_id', gymId)
          .eq('due_date', todayStr)
          .in('status', ['pending', 'partial']);
        
        if (dbDueToday) {
          dueToday = dbDueToday.map((m: any) => ({ ...m.members, membership: m }));
        }

        // Overdue
        const { data: dbOverdue } = await supabase
          .from('memberships')
          .select('*, members(*)')
          .eq('gym_id', gymId)
          .lt('due_date', todayStr)
          .in('status', ['pending', 'partial']);
        
        if (dbOverdue) {
          overdue = dbOverdue.map((m: any) => ({ ...m.members, membership: m }));
        }

        // Expiring soon
        const nextWeekStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const { data: dbExpiring } = await supabase
          .from('memberships')
          .select('*, members(*)')
          .eq('gym_id', gymId)
          .eq('lifecycle', 'active')
          .lte('end_date', nextWeekStr)
          .gte('end_date', todayStr);
        
        if (dbExpiring) {
          expiringSoon = dbExpiring.map((m: any) => ({ ...m.members, membership: m }));
        }

      } catch (dbErr) {
        console.error('Supabase dashboard error:', dbErr);
        throw dbErr;
      }
    } else if (isDemoMode) {
      // Fallback for demo mode ONLY
      metrics = gymService.getDashboardMetrics(gymId);
      const allMembers = gymService.getMembersWithDetails(gymId, '', 'all', 1, 99999).members;
      pendingRegistrations = gymService.getRegistrations(gymId).filter((r) => r.status === 'pending');

      dueToday = allMembers.filter(m => m.membership && m.membership.outstanding_balance > 0 && isDueToday(m.membership.due_date));
      overdue = allMembers.filter(m => m.membership && m.membership.outstanding_balance > 0 && m.membership.is_overdue);
      expiringSoon = allMembers.filter(m => m.membership && m.membership.lifecycle === 'active' && isExpiringSoon(m.membership.end_date, 7));
      
      const gymPayments = gymService.payments.filter((p) => p.gym_id === gymId);
      recentPayments = gymPayments.slice(0, 6).map((p) => {
        const mem = allMembers.find((m) => m.id === p.member_id);
        return { ...p, member_name: mem?.full_name || 'Member' };
      });
    } else {
      return NextResponse.json({ success: false, error: 'Unauthorized state' }, { status: 401 });
    }

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
