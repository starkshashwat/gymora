# QA Test Cases

## Authentication
1. Valid owner can log in.
2. Invalid credentials fail safely.
3. Logged-out user cannot access owner routes.
4. Owner cannot access another gym's data.

## Members
1. Create member with valid data.
2. Reject missing name/phone.
3. Search by name.
4. Search by phone.
5. Existing member is not accidentally duplicated.

## Plans
1. Create plan.
2. Edit plan.
3. Deactivate plan.
4. Inactive plan cannot be selected in new onboarding.
5. Existing membership retains plan snapshot.

## Payments
1. Full cash payment marks outstanding as zero.
2. Full UPI payment marks outstanding as zero.
3. Online method can be recorded even before gateway integration.
4. Partial payment leaves correct balance.
5. Payment history shows method and timestamp.
6. Dashboard collection equals sum of valid payments.
7. Double-click / repeated request does not duplicate a payment.
8. Payment cannot be recorded for another gym.
9. Refunded/void records are handled without corrupting history.

## Due/Overdue
1. Due today appears in Due Today.
2. Past due with balance appears overdue.
3. Fully paid membership does not appear overdue.
4. Future due does not appear overdue.

## WhatsApp
1. Correct normalized phone is inserted.
2. Message contains correct name.
3. Message contains correct outstanding amount.
4. Message is URL encoded correctly.
5. Clicking opens WhatsApp/click-to-chat.
6. No API credentials are required.

## QR
1. QR opens correct gym.
2. Active plans load.
3. Inactive plans are hidden.
4. Registration request stores correct gym_id.
5. Invalid gym slug shows safe not-found state.
6. Customer cannot query member/payment data.
7. Registration can be converted once only.
8. Duplicate phone in same gym is handled.

## Responsive
Test mobile widths first, then tablet and desktop.

## Date/Timezone
Use a single documented business timezone for date-based due calculations. Do not compare browser-local dates against database timestamps without explicit timezone handling.
