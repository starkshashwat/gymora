# Supabase RLS & Security Requirements

## 1. Mandatory
Enable RLS on:
- gyms
- profiles
- membership_plans
- members
- memberships
- payments
- registration_requests
- audit_logs

## 2. Owner Access Pattern
The authenticated owner's gym is derived from `profiles.gym_id`.

Use helper functions where useful, for example:
`public.current_user_gym_id()`

The helper should use `auth.uid()` and return the matching profile gym_id.

Policies should enforce:
`row.gym_id = public.current_user_gym_id()`

Apply this to SELECT/INSERT/UPDATE/DELETE as appropriate.

## 3. Public Onboarding
Do not expose the `members` table publicly.

Prefer a controlled RPC or Edge Function for:
- reading a gym's public onboarding data by slug
- submitting a registration request

Only return:
- gym name/logo/public details
- active plan id/name/duration/price

The registration endpoint must validate:
- gym exists
- gym slug is valid
- selected plan belongs to that gym
- selected plan is active
- required fields are present

## 4. Authentication Security
- Never expose Supabase service-role key in browser code.
- Never put service-role key in `NEXT_PUBLIC_*` variables.
- Validate all owner operations through RLS.
- Use server-side/Edge Function operations only when privileged access is genuinely required.

## 5. Financial Integrity
- Do not let the frontend directly change historical payment amount/status without controlled rules.
- Avoid hard deleting payment records.
- Prevent duplicate Mark Paid requests.
- Use database transactions/RPCs for operations that update payment + membership status together.

## 6. Input Validation
Validate:
- name length
- email format where provided
- phone format
- positive monetary values
- plan ownership
- date consistency
- duplicate member/registration handling

Normalize phone numbers to a consistent format for WhatsApp and search.

## 7. Auditability
Log significant actions:
- member created
- membership created
- payment recorded
- payment reversed/voided
- plan created/updated/deactivated
- registration converted

Never store secrets in audit metadata.
