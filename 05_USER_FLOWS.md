# UX / User Flows

## A. Owner Login
Login
→ Dashboard

## B. Dashboard
Dashboard sections:
1. Today's Collection
2. Pending Amount
3. Due Today
4. Overdue
5. Recent Payments
6. Recent Registrations

Every due/overdue row should have:
`Mark Paid`
`WhatsApp`

## C. Mark Payment Paid
Member row
→ Mark Paid
→ Payment modal
→ amount
→ payment method
→ confirm
→ create payment
→ update membership balance/status
→ refresh dashboard/member row
→ success toast

Default amount should be the outstanding amount.

For normal full payment:
one click from member row should open a compact confirmation/modal, with payment method defaulting to the member's last method if available, while still allowing the owner to change it.

Avoid unnecessary screens.

## D. Partial Payment
Member
→ Mark Paid
→ enter amount less than outstanding
→ choose method
→ confirm
→ membership remains partial/pending with remaining balance.

## E. WhatsApp Reminder
Member
→ WhatsApp button
→ generate click-to-chat URL
→ open WhatsApp
→ prefill message
→ owner manually sends.

Message template:
`Hi {name}, your gym membership payment of ₹{amount} is due/overdue. Please make the payment at your earliest convenience. Thank you.`

Use the customer's normalized international phone number.

This is NOT WhatsApp API automation.

## F. Add Member Manually
Members
→ Add Member
→ name
→ phone
→ email optional
→ choose plan
→ start date
→ amount/due date
→ save

## G. Plan Management
Plans
→ Add Plan
→ name
→ duration
→ price
→ description optional
→ active/inactive

Existing memberships should preserve plan name/price snapshots even if a plan is later edited.

## H. QR Onboarding
Customer scans QR
→ `/join/{gymSlug}`
→ gym branding
→ name
→ mobile
→ email
→ Next
→ select active plan
→ Review
→ Register
→ Confirmation

Registration should create `registration_requests`.

If the MVP uses no payment gateway, do NOT pretend payment was collected. Show:
`Registration submitted — payment pending.`

## I. Convert Registration to Member
Owner sees:
New Registrations
→ Review
→ Approve/Convert
→ create member
→ create membership
→ registration status = converted

If phone already exists for that gym, offer to attach/update instead of blindly creating a duplicate.

## J. Member Details
Show:
- name
- phone
- email
- current plan
- amount due
- next due date
- payment status
- total paid
- payment history
- payment method per transaction
- Mark Paid
- WhatsApp reminder
