export type UserRole = 'owner';
export type MemberStatus = 'active' | 'inactive';
export type MembershipLifecycle = 'active' | 'paused' | 'cancelled' | 'expired';
export type PaymentMethod = 'cash' | 'upi' | 'online' | 'other';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'refunded' | 'void';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'converted';

export type PaymentMode = 'local_qr' | 'gateway';
export type GatewayProvider = 'razorpay' | 'phonepe' | 'cashfree' | 'paytm';
export type WhatsAppMode = 'local_click_to_chat' | 'cloud_api';

export type AutomationEventType =
  | 'registration_submitted'
  | 'registration_approved'
  | 'payment_received'
  | 'partial_payment_received'
  | 'payment_due_soon'
  | 'payment_due_today'
  | 'payment_overdue'
  | 'membership_expiring_soon'
  | 'membership_expired'
  | 'membership_cancelled';

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
  payment_instructions?: string | null;
  auto_cancel_overdue_days?: number | null;
  gateway_provider?: GatewayProvider | null;
  gateway_key_id?: string | null;
  gateway_key_secret?: string | null;
  online_gateway_settings?: Record<string, any> | null;
  whatsapp_mode?: WhatsAppMode;
  fb_waba_id?: string | null;
  fb_phone_number_id?: string | null;
  fb_access_token?: string | null;
  whatsapp_business_settings?: Record<string, any> | null;
  custom_domain?: string | null;
  custom_domain_verified?: boolean;
  brand_color?: string | null;
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
  email?: string;
  slug: string;
  logo_url?: string;
  plans: Array<{
    name: string;
    duration_days: number;
    price: number;
    description?: string;
    image_url?: string;
    features?: string[];
  }>;
  imported_members?: ImportedMemberRow[];
  // Optional / backward compatibility
  payment_mode?: PaymentMode;
  upi_id?: string;
  upi_qr_url?: string;
  whatsapp_mode?: WhatsAppMode;
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
  image_url?: string | null;
  features?: string[];
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
  whatsapp_opt_in?: boolean;
  whatsapp_opted_in_at?: string | null;
  whatsapp_opt_out?: boolean;
  whatsapp_opted_out_at?: string | null;
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
  lifecycle: MembershipLifecycle;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  paused_at?: string | null;
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
  whatsapp_opt_in?: boolean;
  status: RegistrationStatus;
  converted_member_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  gym_id: string;
  event_type: AutomationEventType;
  timing_offset_days: number;
  is_enabled: boolean;
  channel: 'whatsapp' | 'sms';
  template_name: string;
  template_variables?: string[];
  stop_conditions?: {
    on_payment?: boolean;
    on_cancellation?: boolean;
  };
  max_sends: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationLog {
  id: string;
  gym_id: string;
  member_id: string;
  rule_id?: string | null;
  event_type: AutomationEventType;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped_opt_out';
  payload?: Record<string, any>;
  error_message?: string | null;
  sent_at: string;
}

export interface SettingsPayload {
  general?: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    slug: string;
    logo_url?: string;
  };
  payments?: {
    upi_id?: string;
    upi_qr_url?: string;
    payment_instructions?: string;
    gateway_provider?: GatewayProvider | null;
    gateway_key_id?: string;
    gateway_key_secret?: string;
    is_gateway_enabled?: boolean;
  };
  whatsapp?: {
    whatsapp_mode: WhatsAppMode;
    fb_waba_id?: string;
    fb_phone_number_id?: string;
    fb_access_token?: string;
  };
  rules?: {
    auto_cancel_overdue_days?: number | null;
  };
  domain?: {
    custom_domain?: string | null;
    custom_domain_verified?: boolean;
    brand_color?: string | null;
  };
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

export type MemberFilterType = 'all' | 'paid' | 'due' | 'overdue' | 'paused' | 'cancelled' | 'expiring_soon';

// Dashboard Aggregate Metrics
export interface DashboardMetrics {
  today_collection: number;
  today_cash_collection?: number;
  today_upi_collection?: number;
  today_online_collection?: number;
  month_collection: number;
  total_outstanding: number;
  active_members: number;
  due_today_count: number;
  due_today_amount: number;
  overdue_count: number;
  overdue_amount: number;
  expiring_soon_count?: number;
  expiring_soon_amount?: number;
}
