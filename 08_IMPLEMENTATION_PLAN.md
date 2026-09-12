# Implementation Plan for Antigravity

## Phase 0 — Foundation
- Set up TypeScript app
- Set up Supabase project/environment
- Add environment variables
- Create database migration
- Enable RLS
- Create owner auth/profile bootstrap
- Seed one demo gym, owner, plans

## Phase 1 — Owner Core
- Login
- Gym profile
- Dashboard
- Members CRUD
- Plans CRUD
- Membership creation
- Payment history
- Mark Paid
- Partial payment
- Payment method

## Phase 2 — Owner Convenience
- Due/overdue filters
- Search
- WhatsApp deep link
- Collection/pending aggregates
- Audit logs

## Phase 3 — QR Onboarding
- Gym slug route
- Public gym/plan retrieval
- Customer form
- Plan selection
- Registration request
- Owner registration list
- Convert registration to member

## Phase 4 — Hardening
- RLS tests
- Authorization tests
- duplicate submission protection
- mobile responsive QA
- empty/loading/error states
- accessibility
- financial calculation tests
- timezone/date tests
- production deployment

## Definition of Done
### Payments
- [ ] Owner can record full payment in one primary action.
- [ ] Payment method is stored.
- [ ] Partial payment works.
- [ ] Payment history is accurate.
- [ ] Dashboard totals match transaction data.
- [ ] Double-click does not create duplicate payment.

### WhatsApp
- [ ] Correct customer number is used.
- [ ] Message is prefilled.
- [ ] Owner manually sends it.
- [ ] No WhatsApp API dependency exists.

### QR
- [ ] Each gym has a unique onboarding URL/QR.
- [ ] Public page exposes only safe gym + plan data.
- [ ] Registration is tied to correct gym.
- [ ] Owner can convert registration to member.
- [ ] Duplicate phone handling is implemented.

### Security
- [ ] RLS enabled everywhere required.
- [ ] Cross-gym data access is impossible.
- [ ] Service role key is never exposed client-side.

### UX
- [ ] Owner can reach pending payments immediately.
- [ ] Mark Paid requires minimal interaction.
- [ ] App works on mobile and desktop.
