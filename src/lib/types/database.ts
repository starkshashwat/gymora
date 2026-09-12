export type UserRole = 'owner';
export type MemberStatus = 'active' | 'inactive';
export type PaymentMethod = 'cash' | 'upi' | 'online' | 'other';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'void';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'converted';

export type PaymentMode = 'local_qr' | 'gateway';
export type GatewayProvider = 'razorpay' | 'phonepe' | 'cashfree' | 'paytm';
export type WhatsAppMode = 'local_click_to_chat' | 'cloud_api';

export interface Gym {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logo_url?: string | null;
  payment_mode?: PaymentMode;
  upi_id?: string | null;
  upi_qr_url?: string | null;
  gateway_provider?: GatewayProvider | null;
  gateway_key_id?: string | null;
  gateway_key_secret?: string | null;
  whatsapp_mode?: WhatsAppMode;
  fb_waba_id?: string | null;
  fb_phone_number_id?: string | null;
  fb_access_token?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportedMemberRow {
  full_name: string;
  phone: string;
  email?: string;
  plan_name?: string;
  amount_due?: number;
  due_date?: string;
  start_date?: string;
}

export interface OnboardingPayload {
  gym_name: string;
  address?: string;
  phone: string;
  slug: string;
  payment_mode: PaymentMode;
  upi_id?: string;
  upi_qr_url?: string;
  gateway_provider?: GatewayProvider;
  gateway_key_id?: string;
  gateway_key_secret?: string;
  whatsapp_mode: WhatsAppMode;
  fb_waba_id?: string;
  fb_phone_number_id?: string;
  fb_access_token?: string;
  plans: Array<{
    name: string;
    duration_days: number;
    price: number;
    description?: string;
  }>;
  imported_members?: ImportedMemberRow[];
}

export interface Profile {
  id: string;
  gym_id: string;
  full_name?: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface MembershipPlan {
  id: string;
  gym_id: string;
  name: string;
  duration_days: number;
  price: number;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  gym_id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  status: MemberStatus;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id?: string | null;
  plan_name_snapshot: string;
  amount_due: number;
  start_date: string;
  due_date: string;
  end_date?: string | null;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  gym_id: string;
  member_id: string;
  membership_id?: string | null;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  provider?: string | null;
  provider_payment_id?: string | null;
  paid_at: string;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface RegistrationRequest {
  id: string;
  gym_id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  plan_id?: string | null;
  plan_name_snapshot?: string | null;
  plan_price_snapshot?: number | null;
  status: RegistrationStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  gym_id: string;
  actor_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

// Composite Member with current membership details & balance
export interface MemberWithDetails extends Member {
  membership?: (Membership & {
    total_paid: number;
    outstanding_balance: number;
    is_overdue: boolean;
    days_overdue: number;
  }) | null;
  last_payment_method?: PaymentMethod | null;
}

// Dashboard Aggregate Metrics
export interface DashboardMetrics {
  today_collection: number;
  month_collection: number;
  total_outstanding: number;
  active_members: number;
  due_today_count: number;
  due_today_amount: number;
  overdue_count: number;
  overdue_amount: number;
}
