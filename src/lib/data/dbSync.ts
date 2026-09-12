import { NextRequest } from 'next/server';
import { gymService } from './service';
import { initialGym } from './mockDb';
import { MemberWithDetails, PaymentMethod } from '../types/database';
import { getSubdomain, isCustomDomain } from '../utils/domain';

export interface AuthContext {
  gymId?: string;
  isDemoMode: boolean;
  user: any | null;
  isCrossTenantForbidden?: boolean;
}

/**
 * Resolves the authenticated gym owner's gymId and demo mode state uniformly across all API routes.
 */
export async function resolveCurrentGym(
  request: NextRequest,
  supabase: any
): Promise<AuthContext> {
  let user: any = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch {}

  const isDemoCookie = request.cookies.get('gymora_demo_mode')?.value === 'true';
  const gymCookie = request.cookies.get('gymora_gym_id')?.value;
  const sessionCookie = request.cookies.get('gymora_session')?.value === 'true';

  // Demo visitor is someone without a real user account who clicked "See Demo"
  const isDemoMode = !user && isDemoCookie;

  if (isDemoMode) {
    return { gymId: initialGym.id, isDemoMode: true, user: null };
  }

  let gymId: string | undefined = undefined;

  if (user) {
    // 1. Check user_metadata (ignore demo gym attached by mistake)
    if (user.user_metadata?.gym_id && user.user_metadata.gym_id !== initialGym.id) {
      gymId = user.user_metadata.gym_id;
    }

    // 2. Check in-memory user map
    if (!gymId) {
      const memGym = gymService.getUserGym(user.id);
      if (memGym && memGym !== initialGym.id) {
        gymId = memGym;
      }
    }

    // 3. Check profiles table in Supabase
    if (!gymId) {
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
  }

  // 4. Fallback to active gym cookie for owner sessions ONLY if session cookie is present
  if (!gymId && sessionCookie && gymCookie && gymCookie !== initialGym.id) {
    gymId = gymCookie;
  }

  // 5. Cross-Tenant Subdomain & Domain Hijack Protection:
  // Prevent an authenticated user of Gym A from accessing Gym B by changing subdomain or host header
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  const isCustom = isCustomDomain(host);

  if ((subdomain || isCustom) && gymId && !isDemoMode) {
    const targetSlugOrDomain = subdomain || host.split(':')[0].toLowerCase();
    const targetGym =
      gymService.getGymBySlug(targetSlugOrDomain) ||
      gymService.getGymByCustomDomain(targetSlugOrDomain);

    if (targetGym && targetGym.id !== gymId) {
      return {
        gymId: undefined,
        isDemoMode: false,
        user,
        isCrossTenantForbidden: true,
      };
    }
  }

  return {
    gymId,
    isDemoMode: false,
    user,
    isCrossTenantForbidden: false,
  };
}

/**
 * Save a new member and their membership cycle directly to Supabase and keep in-memory store synchronized.
 */
export async function saveMemberToDatabase(
  params: {
    full_name: string;
    phone: string;
    email?: string;
    plan_id: string;
    start_date?: string;
  },
  gymId: string,
  supabase: any,
  user: any
): Promise<{ success: boolean; saved_to_db: boolean; member: MemberWithDetails }> {
  let savedToDb = false;

  // Always persist to in-memory store so it is instantly queryable
  const memoryMember = gymService.addMember({
    gymId,
    full_name: params.full_name,
    phone: params.phone,
    email: params.email,
    plan_id: params.plan_id,
    start_date: params.start_date,
  });

  // If Supabase user is authenticated, also persist to Supabase PostgreSQL database
  if (user && supabase) {
    try {
      // 1. Try atomic add_gym_member RPC if available
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('add_gym_member', {
        p_full_name: params.full_name.trim(),
        p_phone: params.phone.trim(),
        p_email: params.email?.trim() || null,
        p_plan_id: params.plan_id,
        p_start_date: params.start_date || new Date().toISOString().slice(0, 10),
      });

      if (!rpcErr && rpcRes?.success) {
        savedToDb = true;
      } else {
        // 2. Direct Supabase table insert fallback
        const { data: newMemberRow, error: memberErr } = await supabase
          .from('members')
          .insert({
            id: memoryMember.id,
            gym_id: gymId,
            full_name: params.full_name.trim(),
            phone: params.phone.trim(),
            email: params.email?.trim() || null,
            status: 'active',
            joined_at: memoryMember.joined_at,
          })
          .select()
          .single();

        if (!memberErr && newMemberRow) {
          savedToDb = true;
          if (memoryMember.membership) {
            await supabase.from('memberships').insert({
              id: memoryMember.membership.id,
              gym_id: gymId,
              member_id: memoryMember.id,
              plan_id: memoryMember.membership.plan_id,
              plan_name_snapshot: memoryMember.membership.plan_name_snapshot,
              amount_due: memoryMember.membership.amount_due,
              start_date: memoryMember.membership.start_date,
              due_date: memoryMember.membership.due_date,
              end_date: memoryMember.membership.end_date,
              status: memoryMember.membership.status,
            });
          }
        }
      }
    } catch (dbError) {
      console.warn('Supabase member insertion warning (memory fallback active):', dbError);
    }
  }

  return {
    success: true,
    saved_to_db: savedToDb || !user,
    member: memoryMember,
  };
}

/**
 * Delete a member, their memberships, and their payments permanently from Supabase and in-memory store.
 */
export async function deleteMemberFromDatabase(
  memberId: string,
  gymId: string,
  supabase: any,
  user: any
): Promise<{ success: boolean; deleted_from_db: boolean }> {
  let deletedFromDb = false;

  // 1. Delete from in-memory store
  const memDeleted = gymService.deleteMember(memberId, gymId);

  // 2. Delete from Supabase if user is authenticated
  if (user && supabase) {
    try {
      // Try RPC first
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('delete_member', {
        p_member_id: memberId,
      });

      if (!rpcErr && rpcRes?.success) {
        deletedFromDb = true;
      } else {
        // Direct delete (foreign keys cascade)
        const { error: delErr } = await supabase
          .from('members')
          .delete()
          .eq('id', memberId)
          .eq('gym_id', gymId);

        if (!delErr) {
          deletedFromDb = true;
        }
      }
    } catch (dbError) {
      console.warn('Supabase member deletion warning:', dbError);
    }
  }

  return {
    success: memDeleted || deletedFromDb,
    deleted_from_db: deletedFromDb || !user,
  };
}

/**
 * Record payment directly into Supabase and in-memory store.
 */
export async function recordPaymentInDatabase(
  params: {
    member_id: string;
    membership_id: string;
    amount: number;
    payment_method: PaymentMethod;
    notes?: string;
    idempotency_key?: string;
  },
  gymId: string,
  supabase: any,
  user: any
) {
  let dbResult = null;

  // Persist to Supabase as single source of truth if authenticated
  if (user && supabase) {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_payment', {
      p_gym_id: gymId,
      p_member_id: params.member_id,
      p_membership_id: params.membership_id,
      p_amount: params.amount,
      p_payment_method: params.payment_method,
      p_notes: params.notes || null,
      p_idempotency_key: params.idempotency_key || null,
    });

    if (rpcErr) {
      console.error('Supabase payment sync error:', rpcErr);
      throw new Error(rpcErr.message || 'Payment recording failed in database');
    }
    
    dbResult = rpcRes;
  }

  // Update in-memory store for fallback/demo/UI consistency
  const result = gymService.recordPayment(params);

  return dbResult || result;
}

/**
 * Approve registration and create member with payment in database and in-memory store.
 */
export async function approveRegistrationInDatabase(
  params: {
    registration_id: string;
    payment_received?: boolean;
    amount_received?: number;
    payment_method?: PaymentMethod;
    notes?: string;
    idempotency_key?: string;
  },
  gymId: string,
  supabase: any,
  user: any
) {
  let dbResult = null;

  // If user is authenticated, execute in Supabase as source of truth
  if (user && supabase) {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('convert_registration', {
      p_gym_id: gymId,
      p_registration_id: params.registration_id,
      p_amount_paid: params.payment_received ? (params.amount_received || 0) : 0,
      p_payment_method: params.payment_method || 'cash',
      p_notes: params.notes || null,
      p_idempotency_key: params.idempotency_key || null,
    });

    if (rpcErr) {
      console.error('Supabase convert_registration error:', rpcErr);
      throw new Error(rpcErr.message || 'Registration conversion failed in database');
    }
    
    dbResult = rpcRes;
  }

  // Always update memory store for UI consistency
  const memResult = gymService.approveRegistrationWithPayment({
    ...params,
    gym_id: gymId,
  });

  return dbResult || memResult;
}

/**
 * Cancel membership in database and in-memory store.
 */
export async function cancelMembershipInDatabase(
  membershipId: string,
  reason: string | undefined,
  gymId: string,
  supabase: any,
  user: any
) {
  const memResult = gymService.cancelMembership(membershipId, reason, gymId);

  if (user && supabase) {
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('cancel_membership', {
        p_membership_id: membershipId,
        p_reason: reason || null,
      });

      if (rpcErr) {
        await supabase
          .from('memberships')
          .update({
            lifecycle: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', membershipId);
      }
    } catch (e) {
      console.warn('Supabase cancel_membership warning:', e);
    }
  }

  return memResult;
}

/**
 * Pause membership in database and in-memory store.
 */
export async function pauseMembershipInDatabase(
  membershipId: string,
  gymId: string,
  supabase: any,
  user: any
) {
  const memResult = gymService.pauseMembership(membershipId, gymId);

  if (user && supabase) {
    try {
      await supabase.rpc('pause_membership', { p_membership_id: membershipId });
    } catch (e) {
      console.warn('Supabase pause_membership warning:', e);
    }
  }

  return memResult;
}

/**
 * Reactivate membership in database and in-memory store.
 */
export async function reactivateMembershipInDatabase(
  membershipId: string,
  gymId: string,
  supabase: any,
  user: any
) {
  const memResult = gymService.reactivateMembership(membershipId, gymId);

  if (user && supabase) {
    try {
      await supabase.rpc('reactivate_membership', { p_membership_id: membershipId });
    } catch (e) {
      console.warn('Supabase reactivate_membership warning:', e);
    }
  }

  return memResult;
}

/**
 * Renew membership cycle and record payment in database and in-memory store.
 */
export async function renewMemberInDatabase(
  params: {
    member_id: string;
    plan_id: string;
    amount_paid?: number;
    payment_method?: PaymentMethod;
    notes?: string;
    start_date?: string;
    idempotency_key?: string;
  },
  gymId: string,
  supabase: any,
  user: any
) {
  let dbResult = null;

  if (user && supabase) {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('renew_membership', {
      p_gym_id: gymId,
      p_member_id: params.member_id,
      p_plan_id: params.plan_id,
      p_start_date: params.start_date || new Date().toISOString().slice(0, 10),
      p_amount_paid: params.amount_paid || 0,
      p_payment_method: params.payment_method || 'cash',
      p_idempotency_key: params.idempotency_key || null,
    });

    if (rpcErr) {
      console.error('Supabase renew error:', rpcErr);
      throw new Error(rpcErr.message || 'Renewal failed in database');
    }
    
    dbResult = rpcRes;
  }

  // Always update memory store for UI consistency
  const memResult = gymService.renewMembership({
    ...params,
    gym_id: gymId,
  });

  return memResult;
}
