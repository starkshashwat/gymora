# System Architecture

## 1. Recommended Stack
- Frontend: React / Next.js + TypeScript
- UI: Tailwind CSS + component library if already configured
- Backend: Supabase
  - PostgreSQL
  - Supabase Auth
  - Row Level Security (RLS)
  - Storage only if profile/logo assets are needed
  - Edge Functions only where server-side logic is required
- Hosting: Vercel or equivalent
- QR generation: client/server library generating a URL containing the public gym slug/ID
- WhatsApp reminder: `https://wa.me/<international_number>?text=<encoded_message>`

## 2. High-Level Architecture

Browser
  |
  +--> Supabase Auth
  |
  +--> Supabase Postgres + RLS
  |
  +--> Supabase Edge Functions (only for privileged/server-side operations)
  |
  +--> WhatsApp deep link for manual owner-sent reminders

Customer QR
  |
  +--> Public onboarding route `/join/[gymSlug]`
  |
  +--> Read only public gym + active plans
  |
  +--> Create registration request
  |
  +--> Confirmation

## 3. Multi-Tenant Isolation
Every business record must contain `gym_id`.

RLS must ensure:
- authenticated owner can access only rows belonging to their gym
- public onboarding can read only the minimum public gym/plan data
- public registration can INSERT only a registration request for the gym represented by the QR
- customer onboarding must never receive access to private members or payments

Do not rely on frontend filtering for security.

## 4. Authentication
Owner uses Supabase Auth.

Recommended profile mapping:
`auth.users.id -> profiles.id`

`profiles.gym_id -> gyms.id`

Owner role can be represented in `profiles.role`, with MVP role `owner`.

## 5. Public QR Security
QR should contain an opaque/public gym slug rather than exposing internal sensitive data.

Example:
`https://app.example.com/join/stark-fitness-8f31`

Public route may retrieve:
- gym display name
- gym logo if public
- active membership plans

It must not retrieve:
- owner information
- member list
- payment records
- private notes

## 6. Future Payment Gateway Compatibility
Design payment records with:
- `payment_method`
- `provider`
- `provider_payment_id`
- `status`
- `amount`
- `paid_at`

Gateway integration can later create/update payment records through a webhook/Edge Function without changing the member/payment model.
