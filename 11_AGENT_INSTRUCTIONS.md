# Antigravity Build Instructions

You are implementing the Gym Payment Management MVP from the attached project documentation.

## Non-negotiable priorities
1. Working functionality over visual complexity.
2. Supabase is the backend source of truth.
3. Enforce tenant isolation with RLS.
4. Do not invent out-of-scope features.
5. Do not add WhatsApp Business API.
6. Do not build a customer dashboard/app.
7. Do not implement a payment gateway in this MVP.
8. Keep the UI fast and mobile-first.
9. Payment operations must be transactionally safe and duplicate-resistant.
10. Never expose private data through public QR onboarding.

## Implementation order
Read all project docs first, then:
1. database/migrations
2. RLS/security
3. auth
4. owner dashboard
5. members
6. plans
7. payments
8. WhatsApp deep link
9. QR onboarding
10. registration conversion
11. QA and hardening

## Before considering the build complete
Run the test cases in `09_TEST_CASES.md`.
Verify cross-gym RLS isolation with an actual second test gym/user.
Test Mark Paid twice rapidly.
Test QR registration from a real mobile device.
Test WhatsApp reminder with a real international-format number.

## Product principle
Every screen should answer:
> Can the gym owner manage today's payments faster than they could with a spreadsheet or notebook?

If a proposed feature does not directly improve the MVP's core payment workflow, leave it out.
