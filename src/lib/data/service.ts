import {
  Gym,
  MembershipPlan,
  Member,
  Membership,
  Payment,
  RegistrationRequest,
  MemberWithDetails,
  DashboardMetrics,
  PaymentMethod,
  PaymentStatus,
  MembershipLifecycle,
  AutomationRule,
  AutomationLog,
  AutomationEventType,
  SettingsPayload,
} from '../types/database';
import {
  initialGym,
  initialPlans,
  initialMembers,
  initialMemberships,
  initialPayments,
  initialRegistrations,
} from './mockDb';
import { getTodayDateString, isDueToday, isOverdue, getDaysOverdue } from '../utils/date';
import { normalizePhone } from '../utils/phone';

// In-memory persistent state for fast testing & fallback execution
class GymStore {
  gyms: Gym[] = [initialGym];
  plans: MembershipPlan[] = [...initialPlans];
  members: Member[] = [...initialMembers];
  memberships: Membership[] = [...initialMemberships];
  payments: Payment[] = [...initialPayments];
  registrations: RegistrationRequest[] = [...initialRegistrations];
  automationRules: AutomationRule[] = [];
  automationLogs: AutomationLog[] = [];
  userGymMap: Map<string, string> = new Map();

  setUserGym(userId: string, gymId: string) {
    this.userGymMap.set(userId, gymId);
  }

  getUserGym(userId: string): string | undefined {
    return this.userGymMap.get(userId);
  }

  getGym(gymId?: string): Gym {
    if (gymId) {
      const found = this.gyms.find((g) => g.id === gymId);
      if (found) return found;
      // Safe fallback if gymId exists but memory was reset
      const fallbackGym: Gym = {
        id: gymId,
        name: 'My Fitness Gym',
        slug: 'my-fitness-gym',
        phone: '9876543210',
        email: null,
        address: null,
        logo_url: null,
        payment_mode: 'local_qr',
        upi_id: null,
        upi_qr_url: null,
        gateway_provider: null,
        gateway_key_id: null,
        gateway_key_secret: null,
        whatsapp_mode: 'local_click_to_chat',
        fb_waba_id: null,
        fb_phone_number_id: null,
        fb_access_token: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.gyms.push(fallbackGym);
      return fallbackGym;
    }
    // Only return demo gym if no gymId is provided
    return this.gyms[0];
  }

  getPublicGymBySlug(slug: string): { gym: Gym; plans: MembershipPlan[] } | null {
    const gym = this.gyms.find(
      (g) =>
        g.slug === slug ||
        (slug === 'iron-pulse' && g.slug === 'gymora') ||
        (slug === 'gymora' && g.slug === 'iron-pulse')
    );
    if (!gym) return null;
    const activePlans = this.plans.filter((p) => p.gym_id === gym.id && p.is_active);
    return { gym, plans: activePlans };
  }

  getMembersWithDetails(
    gymId?: string,
    query = '',
    filter: 'all' | 'paid' | 'due' | 'overdue' | 'paused' | 'cancelled' = 'all'
  ): MemberWithDetails[] {
    const gym = this.getGym(gymId);
    const gymMembers = this.members.filter((m) => m.gym_id === gym.id);

    const enriched: MemberWithDetails[] = gymMembers.map((member) => {
      // Find latest membership
      const membership = this.memberships
        .filter((m) => m.member_id === member.id)
        .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))[0];

      if (!membership) {
        return {
          ...member,
          membership: null,
          last_payment_method: null,
        };
      }

      // Compute total payments for this membership
      const relatedPayments = this.payments.filter(
        (p) => p.membership_id === membership.id && p.status === 'paid'
      );
      const total_paid = relatedPayments.reduce((acc, p) => acc + Number(p.amount), 0);
      const outstanding_balance = Math.max(0, membership.amount_due - total_paid);
      const overdue = isOverdue(membership.due_date, outstanding_balance);
      const days_overdue = overdue ? getDaysOverdue(membership.due_date) : 0;

      const lastPayment = [...relatedPayments].sort(
        (a, b) => b.paid_at.localeCompare(a.paid_at)
      )[0];

      return {
        ...member,
        membership: {
          ...membership,
          total_paid,
          outstanding_balance,
          is_overdue: overdue,
          days_overdue,
        },
        last_payment_method: lastPayment ? lastPayment.payment_method : null,
      };
    });

    // Apply Search Query
    let result = enriched;
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          (m.email && m.email.toLowerCase().includes(q))
      );
    }

    // Apply Filter
    if (filter === 'paid') {
      result = result.filter((m) => m.membership && m.membership.outstanding_balance === 0);
    } else if (filter === 'due') {
      result = result.filter(
        (m) =>
          m.membership &&
          m.membership.outstanding_balance > 0 &&
          (isDueToday(m.membership.due_date) || !m.membership.is_overdue)
      );
    } else if (filter === 'overdue') {
      result = result.filter((m) => m.membership && m.membership.is_overdue);
    } else if (filter === 'paused') {
      result = result.filter((m) => m.membership?.lifecycle === 'paused');
    } else if (filter === 'cancelled') {
      result = result.filter((m) => m.membership?.lifecycle === 'cancelled');
    }

    return result;
  }

  getMemberById(id: string, gymId?: string): { member: MemberWithDetails; payments: Payment[] } | null {
    const list = this.getMembersWithDetails(gymId);
    const member = list.find((m) => m.id === id);
    if (!member) return null;

    const payments = this.payments
      .filter((p) => p.member_id === id)
      .sort((a, b) => b.paid_at.localeCompare(a.paid_at));

    return { member, payments };
  }

  getDashboardMetrics(gymId?: string): DashboardMetrics {
    const gym = this.getGym(gymId);
    const membersWithDetails = this.getMembersWithDetails(gym.id);
    const today = getTodayDateString();
    const currentMonth = today.slice(0, 7);

    // Filter payments for this gym
    const gymPayments = this.payments.filter((p) => p.gym_id === gym.id && p.status === 'paid');

    // Today's collection
    const today_collection = gymPayments
      .filter((p) => p.paid_at.startsWith(today))
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Month's collection
    const month_collection = gymPayments
      .filter((p) => p.paid_at.startsWith(currentMonth))
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Active members
    const active_members = this.members.filter(
      (m) => m.gym_id === gym.id && m.status === 'active'
    ).length;

    // Total outstanding
    let total_outstanding = 0;
    let due_today_count = 0;
    let due_today_amount = 0;
    let overdue_count = 0;
    let overdue_amount = 0;

    for (const m of membersWithDetails) {
      if (m.membership) {
        const bal = m.membership.outstanding_balance;
        if (bal > 0) {
          total_outstanding += bal;
          if (m.membership.is_overdue) {
            overdue_count++;
            overdue_amount += bal;
          } else if (isDueToday(m.membership.due_date)) {
            due_today_count++;
            due_today_amount += bal;
          }
        }
      }
    }

    return {
      today_collection,
      month_collection,
      total_outstanding,
      active_members,
      due_today_count,
      due_today_amount,
      overdue_count,
      overdue_amount,
    };
  }

  addMember(params: {
    gymId?: string;
    full_name: string;
    phone: string;
    email?: string;
    plan_id: string;
    start_date?: string;
  }): MemberWithDetails {
    const gym = this.getGym(params.gymId);
    const plan = this.plans.find((p) => p.id === params.plan_id);
    if (!plan) throw new Error('Selected plan not found');

    const cleanPhone = normalizePhone(params.phone);
    const today = getTodayDateString();
    const startDate = params.start_date || today;

    // Calculate end date
    const d = new Date(startDate);
    d.setDate(d.getDate() + plan.duration_days);
    const endDate = d.toISOString().slice(0, 10);

    const memberId = crypto.randomUUID();
    const newMember: Member = {
      id: memberId,
      gym_id: gym.id,
      full_name: params.full_name.trim(),
      phone: cleanPhone,
      email: params.email?.trim() || null,
      status: 'active',
      whatsapp_opt_in: (params as any).whatsapp_opt_in ?? false,
      joined_at: startDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mshipId = crypto.randomUUID();
    const newMembership: Membership = {
      id: mshipId,
      gym_id: gym.id,
      member_id: memberId,
      plan_id: plan.id,
      plan_name_snapshot: plan.name,
      amount_due: plan.price,
      start_date: startDate,
      due_date: startDate,
      end_date: endDate,
      status: 'pending',
      lifecycle: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.members.unshift(newMember);
    this.memberships.unshift(newMembership);

    const result = this.getMembersWithDetails(gym.id).find((m) => m.id === memberId);
    if (!result) throw new Error('Failed to retrieve newly created member');
    return result;
  }

  deleteMember(memberId: string, gymId?: string): boolean {
    const memberIndex = this.members.findIndex(
      (m) => m.id === memberId && (!gymId || m.gym_id === gymId)
    );
    if (memberIndex === -1) return false;

    // Remove member
    this.members.splice(memberIndex, 1);
    // Remove memberships for this member
    this.memberships = this.memberships.filter((m) => m.member_id !== memberId);
    // Remove payments for this member
    this.payments = this.payments.filter((p) => p.member_id !== memberId);
    return true;
  }

  recordPayment(params: {
    member_id: string;
    membership_id: string;
    amount: number;
    payment_method: PaymentMethod;
    notes?: string;
  }): {
    success: boolean;
    payment_id: string;
    total_paid: number;
    remaining_balance: number;
    new_status: PaymentStatus;
  } {
    if (params.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const membership = this.memberships.find((m) => m.id === params.membership_id);
    if (!membership) {
      throw new Error('Membership record not found');
    }

    // Existing payments
    const existingPaid = this.payments
      .filter((p) => p.membership_id === membership.id && p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const remaining = membership.amount_due - existingPaid;
    if (params.amount > remaining) {
      throw new Error(`Amount ₹${params.amount} exceeds outstanding balance of ₹${remaining}`);
    }

    const paymentId = crypto.randomUUID();
    const newPayment: Payment = {
      id: paymentId,
      gym_id: membership.gym_id,
      member_id: params.member_id,
      membership_id: params.membership_id,
      amount: params.amount,
      payment_method: params.payment_method,
      status: 'paid',
      paid_at: new Date().toISOString(),
      notes: params.notes?.trim() || null,
      created_at: new Date().toISOString(),
    };

    this.payments.unshift(newPayment);

    const newTotalPaid = existingPaid + params.amount;
    const newBalance = membership.amount_due - newTotalPaid;
    const newStatus: PaymentStatus = newBalance === 0 ? 'paid' : 'partial';

    membership.status = newStatus;
    membership.updated_at = new Date().toISOString();

    return {
      success: true,
      payment_id: paymentId,
      total_paid: newTotalPaid,
      remaining_balance: newBalance,
      new_status: newStatus,
    };
  }

  getPlans(gymId?: string): MembershipPlan[] {
    const gym = this.getGym(gymId);
    let gymPlans = this.plans.filter((p) => p.gym_id === gym.id);
    if (gymPlans.length === 0) {
      const defaultPlans: MembershipPlan[] = [
        {
          id: crypto.randomUUID(),
          gym_id: gym.id,
          name: 'Monthly Standard',
          duration_days: 30,
          price: 1500,
          description: 'Full gym access with locker facilities',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          gym_id: gym.id,
          name: 'Quarterly Pro',
          duration_days: 90,
          price: 4000,
          description: 'Full gym access + 1 free trainer consultation',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          gym_id: gym.id,
          name: 'Annual Elite',
          duration_days: 365,
          price: 14000,
          description: 'Unlimited all-hours access + sauna & nutrition guide',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      this.plans.push(...defaultPlans);
      gymPlans = defaultPlans;
    }
    return gymPlans;
  }

  savePlan(
    plan: Partial<MembershipPlan> & { name: string; duration_days: number; price: number },
    gymId?: string
  ): MembershipPlan {
    const gym = this.getGym(gymId);
    if (plan.id) {
      const idx = this.plans.findIndex((p) => p.id === plan.id);
      if (idx !== -1) {
        this.plans[idx] = {
          ...this.plans[idx],
          name: plan.name,
          duration_days: plan.duration_days,
          price: plan.price,
          description: plan.description || null,
          image_url: plan.image_url !== undefined ? plan.image_url : this.plans[idx].image_url,
          features: plan.features !== undefined ? plan.features : this.plans[idx].features,
          is_active: plan.is_active !== undefined ? plan.is_active : this.plans[idx].is_active,
          updated_at: new Date().toISOString(),
        };
        return this.plans[idx];
      }
    }

    const newPlan: MembershipPlan = {
      id: crypto.randomUUID(),
      gym_id: gym.id,
      name: plan.name,
      duration_days: plan.duration_days,
      price: plan.price,
      description: plan.description || null,
      image_url: plan.image_url || null,
      features: plan.features || [],
      is_active: plan.is_active !== undefined ? plan.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.plans.push(newPlan);
    return newPlan;
  }

  togglePlanActive(planId: string, isActive: boolean): MembershipPlan {
    const plan = this.plans.find((p) => p.id === planId);
    if (!plan) throw new Error('Plan not found');
    plan.is_active = isActive;
    plan.updated_at = new Date().toISOString();
    return plan;
  }

  getRegistrations(gymId?: string): RegistrationRequest[] {
    const gym = this.getGym(gymId);
    return this.registrations
      .filter((r) => r.gym_id === gym.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  createRegistrationRequest(params: {
    gym_slug: string;
    full_name: string;
    phone: string;
    email?: string;
    plan_id: string;
    whatsapp_opt_in?: boolean;
  }): { success: boolean; registration_id: string; gym_name: string; plan_name: string; price: number } {
    const gym = this.gyms.find(
      (g) =>
        g.slug === params.gym_slug ||
        (params.gym_slug === 'iron-pulse' && g.slug === 'gymora') ||
        (params.gym_slug === 'gymora' && g.slug === 'iron-pulse')
    );
    if (!gym) throw new Error('Gym not found for slug ' + params.gym_slug);

    const plan = this.plans.find((p) => p.id === params.plan_id && p.gym_id === gym.id && p.is_active);
    if (!plan) throw new Error('Active plan not found for this gym');

    const regId = crypto.randomUUID();
    const cleanPhone = normalizePhone(params.phone);

    const newReg: RegistrationRequest = {
      id: regId,
      gym_id: gym.id,
      full_name: params.full_name.trim(),
      phone: cleanPhone,
      email: params.email?.trim() || null,
      plan_id: plan.id,
      plan_name_snapshot: plan.name,
      plan_price_snapshot: plan.price,
      whatsapp_opt_in: Boolean(params.whatsapp_opt_in),
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.registrations.unshift(newReg);

    return {
      success: true,
      registration_id: regId,
      gym_name: gym.name,
      plan_name: plan.name,
      price: plan.price,
    };
  }

  convertRegistrationToMember(
    registrationId: string,
    startDate?: string
  ): { success: boolean; member_id: string; membership_id: string } {
    const reg = this.registrations.find((r) => r.id === registrationId);
    if (!reg) throw new Error('Registration request not found');
    if (reg.status === 'converted') throw new Error('Registration is already converted');

    // Check if phone already exists
    let member = this.members.find((m) => m.gym_id === reg.gym_id && m.phone === reg.phone);
    if (!member) {
      member = {
        id: crypto.randomUUID(),
        gym_id: reg.gym_id,
        full_name: reg.full_name,
        phone: reg.phone,
        email: reg.email,
        status: 'active',
        joined_at: startDate || getTodayDateString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.members.unshift(member);
    }

    const plan = this.plans.find((p) => p.id === reg.plan_id);
    const duration = plan ? plan.duration_days : 30;
    const start = startDate || getTodayDateString();
    const d = new Date(start);
    d.setDate(d.getDate() + duration);
    const end = d.toISOString().slice(0, 10);

    const mshipId = crypto.randomUUID();
    const membership: Membership = {
      id: mshipId,
      gym_id: reg.gym_id,
      member_id: member.id,
      plan_id: reg.plan_id,
      plan_name_snapshot: reg.plan_name_snapshot || plan?.name || 'Membership',
      amount_due: reg.plan_price_snapshot || plan?.price || 0,
      start_date: start,
      due_date: start,
      end_date: end,
      status: 'pending',
      lifecycle: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.memberships.unshift(membership);
    reg.status = 'converted';
    reg.updated_at = new Date().toISOString();

    return {
      success: true,
      member_id: member.id,
      membership_id: mshipId,
    };
  }

  cancelMembership(
    membershipId: string,
    reason?: string,
    gymId?: string
  ): { success: boolean; membership_id: string; membership: Membership } & Membership {
    const gym = this.getGym(gymId);
    const mship = this.memberships.find((m) => m.id === membershipId && (!gymId || m.gym_id === gym.id));
    if (!mship) throw new Error('Membership not found');

    mship.lifecycle = 'cancelled';
    mship.cancelled_at = new Date().toISOString();
    mship.cancellation_reason = reason || 'Cancelled by gym owner';
    mship.updated_at = new Date().toISOString();

    // Check if member has other active memberships
    const hasOtherActive = this.memberships.some(
      (m) => m.member_id === mship.member_id && m.lifecycle === 'active' && m.id !== membershipId
    );
    if (!hasOtherActive) {
      const mem = this.members.find((m) => m.id === mship.member_id);
      if (mem) {
        mem.status = 'inactive';
        mem.updated_at = new Date().toISOString();
      }
    }

    return { success: true, membership_id: membershipId, membership: mship, ...mship };
  }

  pauseMembership(membershipId: string, gymId?: string): { success: boolean; membership_id: string; membership: Membership } & Membership {
    const gym = this.getGym(gymId);
    const mship = this.memberships.find((m) => m.id === membershipId && (!gymId || m.gym_id === gym.id));
    if (!mship) throw new Error('Membership not found');

    mship.lifecycle = 'paused';
    mship.paused_at = new Date().toISOString();
    mship.updated_at = new Date().toISOString();
    return { success: true, membership_id: membershipId, membership: mship, ...mship };
  }

  reactivateMembership(membershipId: string, gymId?: string): { success: boolean; membership_id: string; membership: Membership } & Membership {
    const gym = this.getGym(gymId);
    const mship = this.memberships.find((m) => m.id === membershipId && (!gymId || m.gym_id === gym.id));
    if (!mship) throw new Error('Membership not found');

    mship.lifecycle = 'active';
    mship.paused_at = null;
    mship.cancelled_at = null;
    mship.updated_at = new Date().toISOString();

    const mem = this.members.find((m) => m.id === mship.member_id);
    if (mem) {
      mem.status = 'active';
      mem.updated_at = new Date().toISOString();
    }

    return { success: true, membership_id: membershipId, membership: mship, ...mship };
  }

  approveRegistrationWithPayment(params: {
    registration_id: string;
    payment_received?: boolean;
    amount_received?: number;
    payment_method?: PaymentMethod;
    notes?: string;
    gym_id?: string;
  }): {
    success: boolean;
    member: Member;
    membership: Membership;
    payment: Payment | null;
    member_id: string;
    membership_id: string;
    payment_id?: string;
    full_name: string;
    payment_status: PaymentStatus;
    remaining_balance: number;
  } {
    const reg = this.registrations.find((r) => r.id === params.registration_id);
    if (!reg) throw new Error('Registration request not found');
    const gym = this.getGym(params.gym_id || reg.gym_id);
    if (reg.status === 'converted') throw new Error('Registration is already converted');

    let member = this.members.find((m) => m.gym_id === gym.id && m.phone === reg.phone);
    if (!member) {
      member = {
        id: crypto.randomUUID(),
        gym_id: gym.id,
        full_name: reg.full_name,
        phone: reg.phone,
        email: reg.email,
        status: 'active',
        whatsapp_opt_in: reg.whatsapp_opt_in ?? false,
        joined_at: getTodayDateString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.members.unshift(member);
    }

    const plan = this.plans.find((p) => p.id === reg.plan_id);
    const duration = plan ? plan.duration_days : 30;
    const start = getTodayDateString();
    const d = new Date(start);
    d.setDate(d.getDate() + duration);
    const end = d.toISOString().slice(0, 10);

    const planPrice = reg.plan_price_snapshot || plan?.price || 0;
    const amountReceived = params.payment_received ? Number(params.amount_received || 0) : 0;
    let paymentStatus: PaymentStatus = 'pending';
    let remainingBalance = planPrice;

    if (params.payment_received && amountReceived > 0) {
      if (amountReceived >= planPrice) {
        paymentStatus = 'paid';
        remainingBalance = 0;
      } else {
        paymentStatus = 'partial';
        remainingBalance = planPrice - amountReceived;
      }
    }

    const mshipId = crypto.randomUUID();
    const membership: Membership = {
      id: mshipId,
      gym_id: gym.id,
      member_id: member.id,
      plan_id: reg.plan_id,
      plan_name_snapshot: reg.plan_name_snapshot || plan?.name || 'Membership',
      amount_due: planPrice,
      start_date: start,
      due_date: start,
      end_date: end,
      status: paymentStatus,
      lifecycle: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.memberships.unshift(membership);

    let paymentId: string | undefined = undefined;
    let paymentRecord: Payment | null = null;
    if (params.payment_received && amountReceived > 0) {
      paymentId = crypto.randomUUID();
      paymentRecord = {
        id: paymentId,
        gym_id: gym.id,
        member_id: member.id,
        membership_id: mshipId,
        amount: amountReceived,
        payment_method: params.payment_method || 'cash',
        status: 'paid',
        paid_at: new Date().toISOString(),
        notes: params.notes?.trim() || 'Payment received upon QR registration approval',
        created_at: new Date().toISOString(),
      };
      this.payments.unshift(paymentRecord);
    }

    reg.status = 'converted';
    reg.updated_at = new Date().toISOString();

    return {
      success: true,
      member,
      membership,
      payment: paymentRecord,
      member_id: member.id,
      membership_id: mshipId,
      payment_id: paymentId,
      full_name: reg.full_name,
      payment_status: paymentStatus,
      remaining_balance: remainingBalance,
    };
  }

  getSettings(gymId?: string): SettingsPayload {
    const gym = this.getGym(gymId);
    return {
      general: {
        name: gym.name,
        phone: gym.phone || '',
        email: gym.email || undefined,
        address: gym.address || undefined,
        slug: gym.slug,
        logo_url: gym.logo_url || undefined,
      },
      payments: {
        upi_id: gym.upi_id || undefined,
        upi_qr_url: gym.upi_qr_url || undefined,
        payment_instructions: gym.payment_instructions || undefined,
        gateway_provider: gym.gateway_provider || null,
        gateway_key_id: gym.gateway_key_id || undefined,
        is_gateway_enabled: gym.payment_mode === 'gateway',
      },
      whatsapp: {
        whatsapp_mode: gym.whatsapp_mode || 'local_click_to_chat',
        fb_waba_id: gym.fb_waba_id || undefined,
        fb_phone_number_id: gym.fb_phone_number_id || undefined,
      },
      rules: {
        auto_cancel_overdue_days: gym.auto_cancel_overdue_days || null,
      },
    };
  }

  updateSettings(gymId: string, payload: SettingsPayload): Gym {
    const gym = this.getGym(gymId);
    if (payload.general) {
      if (payload.general.name) gym.name = payload.general.name.trim();
      if (payload.general.phone) gym.phone = payload.general.phone.trim();
      if (payload.general.email !== undefined) gym.email = payload.general.email?.trim() || null;
      if (payload.general.address !== undefined) gym.address = payload.general.address?.trim() || null;
      if (payload.general.logo_url !== undefined) gym.logo_url = payload.general.logo_url || null;
      if (payload.general.slug) {
        gym.slug = payload.general.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      }
    }

    if (payload.payments) {
      if (payload.payments.upi_id !== undefined) gym.upi_id = payload.payments.upi_id?.trim() || null;
      if (payload.payments.upi_qr_url !== undefined) gym.upi_qr_url = payload.payments.upi_qr_url || null;
      if (payload.payments.payment_instructions !== undefined) gym.payment_instructions = payload.payments.payment_instructions;
      if (payload.payments.gateway_provider !== undefined) gym.gateway_provider = payload.payments.gateway_provider;
      if (payload.payments.gateway_key_id !== undefined) gym.gateway_key_id = payload.payments.gateway_key_id?.trim() || null;
      if (payload.payments.gateway_key_secret) gym.gateway_key_secret = payload.payments.gateway_key_secret?.trim() || null;
      if (payload.payments.is_gateway_enabled !== undefined) {
        gym.payment_mode = payload.payments.is_gateway_enabled ? 'gateway' : 'local_qr';
      }
    }

    if (payload.whatsapp) {
      if (payload.whatsapp.whatsapp_mode) gym.whatsapp_mode = payload.whatsapp.whatsapp_mode;
      if (payload.whatsapp.fb_waba_id !== undefined) gym.fb_waba_id = payload.whatsapp.fb_waba_id || null;
      if (payload.whatsapp.fb_phone_number_id !== undefined) gym.fb_phone_number_id = payload.whatsapp.fb_phone_number_id || null;
      if (payload.whatsapp.fb_access_token) gym.fb_access_token = payload.whatsapp.fb_access_token || null;
    }

    if (payload.rules) {
      if (payload.rules.auto_cancel_overdue_days !== undefined) {
        gym.auto_cancel_overdue_days = payload.rules.auto_cancel_overdue_days;
      }
    }

    gym.updated_at = new Date().toISOString();
    return gym;
  }

  ensureDefaultAutomationRules(gymId: string): AutomationRule[] {
    let gymRules = this.automationRules.filter((r) => r.gym_id === gymId);
    if (gymRules.length === 0) {
      const defaults: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          gym_id: gymId,
          event_type: 'registration_submitted',
          timing_offset_days: 0,
          is_enabled: true,
          channel: 'whatsapp',
          template_name: 'gym_registration_received',
          max_sends: 1,
        },
        {
          gym_id: gymId,
          event_type: 'registration_approved',
          timing_offset_days: 0,
          is_enabled: true,
          channel: 'whatsapp',
          template_name: 'gym_welcome',
          max_sends: 1,
        },
        {
          gym_id: gymId,
          event_type: 'payment_due_soon',
          timing_offset_days: -3,
          is_enabled: true,
          channel: 'whatsapp',
          template_name: 'gym_payment_due',
          max_sends: 1,
        },
        {
          gym_id: gymId,
          event_type: 'payment_due_today',
          timing_offset_days: 0,
          is_enabled: true,
          channel: 'whatsapp',
          template_name: 'gym_payment_due_today',
          max_sends: 1,
        },
        {
          gym_id: gymId,
          event_type: 'payment_overdue',
          timing_offset_days: 3,
          is_enabled: true,
          channel: 'whatsapp',
          template_name: 'gym_payment_overdue',
          max_sends: 1,
        },
        {
          gym_id: gymId,
          event_type: 'payment_received',
          timing_offset_days: 0,
          is_enabled: true,
          channel: 'whatsapp',
          template_name: 'gym_payment_receipt',
          max_sends: 1,
        },
        {
          gym_id: gymId,
          event_type: 'partial_payment_received',
          timing_offset_days: 0,
          is_enabled: true,
          channel: 'whatsapp',
          template_name: 'gym_partial_receipt',
          max_sends: 1,
        },
        {
          gym_id: gymId,
          event_type: 'membership_expiring_soon',
          timing_offset_days: -7,
          is_enabled: true,
          channel: 'whatsapp',
          template_name: 'gym_plan_expiry_warning',
          max_sends: 1,
        },
        {
          gym_id: gymId,
          event_type: 'membership_expired',
          timing_offset_days: 0,
          is_enabled: true,
          channel: 'whatsapp',
          template_name: 'gym_plan_expired',
          max_sends: 1,
        },
        {
          gym_id: gymId,
          event_type: 'membership_cancelled',
          timing_offset_days: 0,
          is_enabled: true,
          channel: 'whatsapp',
          template_name: 'gym_membership_cancelled',
          max_sends: 1,
        },
      ];

      const created = defaults.map((d) => ({
        ...d,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      this.automationRules.push(...created);
      gymRules = created;
    }
    return gymRules;
  }

  getAutomationRules(gymId?: string): AutomationRule[] {
    const gym = this.getGym(gymId);
    return this.ensureDefaultAutomationRules(gym.id);
  }

  updateAutomationRule(
    arg1: string,
    arg2: string | Partial<AutomationRule>,
    arg3?: Partial<AutomationRule> | string
  ): AutomationRule {
    let gymId: string | undefined;
    let ruleId: string;
    let updates: Partial<AutomationRule>;

    if (typeof arg2 === 'string') {
      gymId = arg1;
      ruleId = arg2;
      updates = (arg3 as Partial<AutomationRule>) || {};
    } else {
      ruleId = arg1;
      updates = arg2 || {};
      gymId = arg3 as string | undefined;
    }

    const gym = this.getGym(gymId);
    const rule = this.automationRules.find((r) => r.id === ruleId && (!gymId || r.gym_id === gym.id));
    if (!rule) throw new Error('Automation rule not found');

    if (updates.is_enabled !== undefined) rule.is_enabled = updates.is_enabled;
    if (updates.timing_offset_days !== undefined) rule.timing_offset_days = updates.timing_offset_days;
    if (updates.template_name) rule.template_name = updates.template_name;
    if (updates.max_sends !== undefined) rule.max_sends = updates.max_sends;
    rule.updated_at = new Date().toISOString();
    return rule;
  }

  checkAndApplyAutoCancellation(gymId?: string): number {
    const gym = this.getGym(gymId);
    if (!gym.auto_cancel_overdue_days || gym.auto_cancel_overdue_days <= 0) return 0;

    let cancelledCount = 0;
    const gymMemberships = this.memberships.filter((m) => m.gym_id === gym.id && m.lifecycle === 'active');

    for (const mship of gymMemberships) {
      const relatedPayments = this.payments.filter((p) => p.membership_id === mship.id && p.status === 'paid');
      const paid = relatedPayments.reduce((acc, p) => acc + Number(p.amount), 0);
      const balance = mship.amount_due - paid;

      if (balance > 0 && isOverdue(mship.due_date, balance)) {
        const daysOverdue = getDaysOverdue(mship.due_date);
        if (daysOverdue >= gym.auto_cancel_overdue_days) {
          this.cancelMembership(mship.id, `Auto-cancelled: exceeded ${gym.auto_cancel_overdue_days} days overdue`, gym.id);
          cancelledCount++;
        }
      }
    }
    return cancelledCount;
  }

  onboardGymOwner(payload: import('../types/database').OnboardingPayload): {
    success: boolean;
    gym_id: string;
    gym_slug: string;
    imported_count: number;
  } {
    const gymId = crypto.randomUUID();
    const cleanSlug =
      (payload.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'gymora';

    const newGym: Gym = {
      id: gymId,
      name: payload.gym_name.trim(),
      slug: cleanSlug,
      phone: normalizePhone(payload.phone),
      email: payload.email?.trim() || null,
      address: payload.address?.trim() || null,
      logo_url: null,
      payment_mode: payload.payment_mode || 'local_qr',
      upi_id: payload.upi_id?.trim() || null,
      upi_qr_url: payload.upi_qr_url || null,
      gateway_provider: (payload as any).gateway_provider || null,
      gateway_key_id: (payload as any).gateway_key_id?.trim() || null,
      gateway_key_secret: (payload as any).gateway_key_secret?.trim() || null,
      whatsapp_mode: payload.whatsapp_mode || 'local_click_to_chat',
      fb_waba_id: (payload as any).fb_waba_id?.trim() || null,
      fb_phone_number_id: (payload as any).fb_phone_number_id?.trim() || null,
      fb_access_token: (payload as any).fb_access_token?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.gyms.unshift(newGym);

    // Create plans
    const createdPlans: MembershipPlan[] = [];
    if (payload.plans && payload.plans.length > 0) {
      payload.plans.forEach((p) => {
        const plan: MembershipPlan = {
          id: crypto.randomUUID(),
          gym_id: gymId,
          name: p.name,
          duration_days: p.duration_days,
          price: p.price,
          description: p.description || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.plans.unshift(plan);
        createdPlans.push(plan);
      });
    }

    // Import members if provided
    let importedCount = 0;
    if (payload.imported_members && payload.imported_members.length > 0) {
      payload.imported_members.forEach((m) => {
        const memberId = crypto.randomUUID();
        const member: Member = {
          id: memberId,
          gym_id: gymId,
          full_name: m.full_name,
          phone: m.phone,
          email: m.email || null,
          status: 'active',
          whatsapp_opt_in: false,
          joined_at: m.start_date || getTodayDateString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.members.unshift(member);

        const matchingPlan =
          createdPlans.find((cp) => cp.name.toLowerCase() === (m.plan_name || '').toLowerCase()) ||
          createdPlans[0];

        const mshipId = crypto.randomUUID();
        const membership: Membership = {
          id: mshipId,
          gym_id: gymId,
          member_id: memberId,
          plan_id: matchingPlan?.id || null,
          plan_name_snapshot: matchingPlan?.name || m.plan_name || 'Standard',
          amount_due: m.amount_due || matchingPlan?.price || 1500,
          start_date: m.start_date || getTodayDateString(),
          due_date: m.due_date || getTodayDateString(),
          end_date: null,
          status: 'pending',
          lifecycle: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.memberships.unshift(membership);
        importedCount++;
      });
    }

    return {
      success: true,
      gym_id: gymId,
      gym_slug: cleanSlug,
      imported_count: importedCount,
    };
  }
}

// Global Singleton Store persisted on globalThis to prevent reload wipes in dev
const globalForGym = globalThis as unknown as { gymStore?: GymStore };
export const gymService = globalForGym.gymStore || new GymStore();
globalForGym.gymStore = gymService;
