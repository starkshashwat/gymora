# Gym Payment Management MVP — Product Requirements Document

## 1. Product Goal
Build a simple web app for gym owners to manage member payments and onboard new members through a gym-specific QR code.

The MVP must solve one core problem:
> The gym owner should instantly know who has paid, who is due/overdue, how much is pending, and be able to mark a payment as received in one click.

A second entry point allows a prospective/current customer to scan a gym QR code, enter their details, choose a membership plan, and register with that gym.

## 2. Scope

### Owner features
- Owner authentication
- Gym profile
- Dashboard
- Member management
- Add member manually
- Member search/filter
- Member detail page
- Payment status
- One-click Mark Paid
- Cash / UPI / Online payment method recording
- Payment history
- Partial payment support
- Due date and overdue calculation
- WhatsApp reminder button using a WhatsApp click-to-chat/deep link, NOT WhatsApp API
- Membership plan CRUD
- Gym-specific QR generation
- Basic collection/pending reports

### Customer onboarding features
- Scan gym-specific QR
- Landing/onboarding page
- Enter full name, mobile number, email
- Select membership plan
- Registration confirmation
- If online gateway is not yet enabled, create registration with payment_pending status
- No customer dashboard/app in MVP

### Explicitly out of scope
- WhatsApp Business API / Cloud API
- Automated WhatsApp sending
- Customer dashboard
- Customer mobile app
- Attendance
- Workout/diet plans
- Trainer management
- Supplement marketplace
- Expenses
- Multi-branch management
- Advanced analytics
- Subscription auto-debit
- Payment gateway implementation in MVP

## 3. User Roles
### Owner
Can manage only their own gym, members, plans, payments, QR and dashboard.

### Customer
Unauthenticated onboarding user. Can submit registration through a gym QR. No authenticated customer portal is required in MVP.

## 4. Core Owner Flow
Login → Dashboard → Due/Overdue member → Mark Paid → choose/confirm payment method → payment recorded → member status updated.

## 5. Core QR Flow
Scan QR → Gym onboarding page → enter name/mobile/email → Next → choose plan → Submit registration → confirmation.

## 6. Payment Rules
- A member has a current membership cycle with amount and due date.
- Payment records are immutable financial records; corrections should be handled through reversal/adjustment rather than destructive edits.
- Mark Paid should be idempotent and prevent duplicate payment creation from double clicks.
- For partial payment, amount received is recorded and remaining balance stays due.
- Supported MVP payment methods: cash, UPI, online, other.
- Online is a recordable method now; actual gateway integration is future scope.

## 7. Success Criteria
- Owner can add a member in under 30 seconds.
- Owner can mark a due payment paid in one primary action.
- Dashboard clearly separates paid, due and overdue amounts.
- Owner can find a member quickly by name or phone.
- Owner can see complete payment history.
- QR registration correctly attaches every registration to the correct gym.
- No gym can read or modify another gym's data.
