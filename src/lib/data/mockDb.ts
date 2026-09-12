import {
  Gym,
  MembershipPlan,
  Member,
  Membership,
  Payment,
  RegistrationRequest,
  AuditLog,
} from '../types/database';
import { getTodayDateString } from '../utils/date';

const today = getTodayDateString();

// Helper to subtract or add days from today
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addDaysISO(days: number, hour = 11, minute = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const initialGym: Gym = {
  id: 'gym-gymora-01',
  name: 'Gymora',
  slug: 'gymora',
  phone: '+91 98765 43210',
  email: 'owner@gymora.fit',
  address: '42 Fitness Boulevard, Bandra West, Mumbai',
  logo_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&auto=format&fit=crop&q=80',
  custom_domain: null,
  custom_domain_verified: false,
  brand_color: '#10b981',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const initialPlans: MembershipPlan[] = [
  {
    id: 'plan-monthly-01',
    gym_id: initialGym.id,
    name: 'Monthly Standard',
    duration_days: 30,
    price: 1500,
    description: 'Full gym floor access + locker facilities',
    image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
    features: ['Full gym floor access', 'Locker room access', 'Standard equipment'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'plan-quarterly-02',
    gym_id: initialGym.id,
    name: 'Quarterly Pro',
    duration_days: 90,
    price: 4000,
    description: 'Gym access + 1 complimentary trainer assessment',
    image_url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&auto=format&fit=crop&q=80',
    features: ['All Monthly Standard features', '1x Trainer assessment', 'Dietary guidance'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'plan-annual-03',
    gym_id: initialGym.id,
    name: 'Annual Elite',
    duration_days: 365,
    price: 14000,
    description: 'All-hours access + sauna + nutrition guide',
    image_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&fit=crop&q=80',
    features: ['All Quarterly Pro features', 'Sauna & Steam bath access', 'Dedicated personal locker', 'Guest passes'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const initialMembers: Member[] = [
  {
    id: 'member-01',
    gym_id: initialGym.id,
    full_name: 'Aarav Sharma',
    phone: '+919876543210',
    email: 'aarav.sharma@example.com',
    status: 'active',
    whatsapp_opt_in: true,
    joined_at: addDays(-30),
    created_at: addDays(-30),
    updated_at: addDays(-30),
  },
  {
    id: 'member-02',
    gym_id: initialGym.id,
    full_name: 'Priya Patel',
    phone: '+919812345678',
    email: 'priya.patel@example.com',
    status: 'active',
    whatsapp_opt_in: true,
    joined_at: addDays(-95),
    created_at: addDays(-95),
    updated_at: addDays(-95),
  },
  {
    id: 'member-03',
    gym_id: initialGym.id,
    full_name: 'Rahul Verma',
    phone: '+919765432109',
    email: 'rahul.verma@example.com',
    status: 'active',
    whatsapp_opt_in: false,
    joined_at: addDays(-10),
    created_at: addDays(-10),
    updated_at: addDays(-10),
  },
  {
    id: 'member-04',
    gym_id: initialGym.id,
    full_name: 'Ananya Iyer',
    phone: '+919988776655',
    email: 'ananya.iyer@example.com',
    status: 'active',
    whatsapp_opt_in: true,
    joined_at: addDays(-20),
    created_at: addDays(-20),
    updated_at: addDays(-20),
  },
];

export const initialMemberships: Membership[] = [
  {
    id: 'mship-01',
    gym_id: initialGym.id,
    member_id: 'member-01',
    plan_id: 'plan-monthly-01',
    plan_name_snapshot: 'Monthly Standard',
    amount_due: 1500,
    start_date: today,
    due_date: today,
    end_date: addDays(30),
    status: 'pending',
    lifecycle: 'active',
    created_at: today,
    updated_at: today,
  },
  {
    id: 'mship-02',
    gym_id: initialGym.id,
    member_id: 'member-02',
    plan_id: 'plan-quarterly-02',
    plan_name_snapshot: 'Quarterly Pro',
    amount_due: 4000,
    start_date: addDays(-95),
    due_date: addDays(-5), // Overdue by 5 days
    end_date: addDays(-5),
    status: 'pending',
    lifecycle: 'active',
    created_at: addDays(-95),
    updated_at: addDays(-95),
  },
  {
    id: 'mship-03',
    gym_id: initialGym.id,
    member_id: 'member-03',
    plan_id: 'plan-monthly-01',
    plan_name_snapshot: 'Monthly Standard',
    amount_due: 1500,
    start_date: addDays(-10),
    due_date: addDays(20),
    end_date: addDays(20),
    status: 'partial',
    lifecycle: 'active',
    created_at: addDays(-10),
    updated_at: addDays(-10),
  },
  {
    id: 'mship-04',
    gym_id: initialGym.id,
    member_id: 'member-04',
    plan_id: 'plan-monthly-01',
    plan_name_snapshot: 'Monthly Standard',
    amount_due: 1500,
    start_date: addDays(-20),
    due_date: addDays(10),
    end_date: addDays(10),
    status: 'paid',
    lifecycle: 'active',
    created_at: addDays(-20),
    updated_at: addDays(-20),
  },
];

export const initialPayments: Payment[] = [
  {
    id: 'pay-01',
    gym_id: initialGym.id,
    member_id: 'member-03',
    membership_id: 'mship-03',
    amount: 500,
    payment_method: 'upi',
    status: 'paid',
    paid_at: addDaysISO(-2, 16, 8),
    notes: 'Advance installment via UPI',
    created_at: addDaysISO(-2, 16, 8),
  },
  {
    id: 'pay-02',
    gym_id: initialGym.id,
    member_id: 'member-04',
    membership_id: 'mship-04',
    amount: 1500,
    payment_method: 'cash',
    status: 'paid',
    paid_at: addDaysISO(-1, 10, 15),
    notes: 'Full payment cash at reception',
    created_at: addDaysISO(-1, 10, 15),
  },
];

export const initialRegistrations: RegistrationRequest[] = [
  {
    id: 'reg-01',
    gym_id: initialGym.id,
    full_name: 'Rohan Mehta',
    phone: '+919823456789',
    email: 'rohan.mehta@example.com',
    plan_id: 'plan-monthly-01',
    plan_name_snapshot: 'Monthly Standard',
    plan_price_snapshot: 1500,
    status: 'pending',
    created_at: addDays(-1),
    updated_at: addDays(-1),
  },
];
