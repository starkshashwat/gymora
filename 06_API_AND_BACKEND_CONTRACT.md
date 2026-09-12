# Backend / Data Contract

## Preferred Approach
Use Supabase client for standard CRUD where RLS safely covers the operation.
Use Postgres RPCs or Edge Functions for atomic business operations.

## Recommended Business Operations

### `record_payment`
Inputs:
- member_id
- membership_id
- amount
- payment_method
- notes optional

Server/database responsibilities:
1. Verify owner has access to member/membership.
2. Verify amount is positive and does not exceed allowable outstanding balance unless overpayment is explicitly supported.
3. Insert payment.
4. Calculate remaining outstanding balance.
5. Update membership payment status.
6. Write audit log.
7. Return updated membership + payment summary.

Operation must be safe against duplicate submissions.

### `create_registration_request`
Inputs:
- gym_slug
- full_name
- phone
- email optional
- plan_id

Responsibilities:
- validate gym
- validate active plan belongs to gym
- normalize phone
- create request
- return confirmation-safe response

### `convert_registration_to_member`
Inputs:
- registration_id

Responsibilities:
- owner authorization
- prevent duplicate conversion
- create/find member
- create membership
- mark registration converted
- audit action
- use transaction semantics

## Dashboard Queries
Dashboard should derive:
- active member count
- collection today
- collection this month
- total outstanding
- due today count/amount
- overdue count/amount
- recent payments
- upcoming dues

Avoid fetching all payments/members to the browser just to calculate totals.

Prefer SQL views/RPCs or aggregate queries.

## Status Calculation
Do not rely only on a stored text status.

A membership is:
- `paid` when outstanding = 0
- `partial` when paid > 0 and outstanding > 0
- `pending` when paid = 0 and due date >= today
- `pending/overdue` when outstanding > 0 and due date < today

If a separate overdue status is desired for UI, derive it from due_date + outstanding balance rather than duplicating state unnecessarily.

## WhatsApp URL
Format:
`https://wa.me/{international_phone}?text={url_encoded_message}`

Never send via API in MVP.
