import { NextResponse } from 'next/server';
import { gymService } from '@/lib/data/service';
import { isDueToday } from '@/lib/utils/date';

export async function GET() {
  try {
    const metrics = gymService.getDashboardMetrics();
    const allMembers = gymService.getMembersWithDetails();

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
    const recentPayments = gymService.payments.slice(0, 6).map((p) => {
      const mem = allMembers.find((m) => m.id === p.member_id);
      return {
        ...p,
        member_name: mem?.full_name || 'Member',
      };
    });

    // Pending registrations (for instant notification on dashboard)
    const pendingRegistrations = gymService
      .getRegistrations()
      .filter((r) => r.status === 'pending');

    return NextResponse.json({
      success: true,
      metrics,
      dueToday,
      overdue,
      recentPayments,
      pendingRegistrations,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
