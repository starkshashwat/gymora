-- Gym Payment Management MVP
-- Migration 000004: Owner Onboarding Settings, Gateways & WhatsApp Configuration

-- Extend public.gyms table
alter table public.gyms
  -- Payment Configuration
  add column if not exists payment_mode text not null default 'local_qr' 
    check (payment_mode in ('local_qr', 'gateway')),
  add column if not exists upi_id text,
  add column if not exists upi_qr_url text,
  add column if not exists gateway_provider text 
    check (gateway_provider in ('razorpay', 'phonepe', 'cashfree', 'paytm')),
  add column if not exists gateway_key_id text,
  add column if not exists gateway_key_secret text,

  -- WhatsApp Configuration
  add column if not exists whatsapp_mode text not null default 'local_click_to_chat'
    check (whatsapp_mode in ('local_click_to_chat', 'cloud_api')),
  add column if not exists fb_waba_id text,
  add column if not exists fb_phone_number_id text,
  add column if not exists fb_access_token text;
