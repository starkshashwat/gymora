# UI Screen Specification

## Design Direction
- Clean, professional SaaS dashboard
- Mobile-first
- Fast actions
- Payment status visually obvious
- Avoid feature clutter
- Responsive desktop/tablet/mobile

## Owner Screens

### 1. Login
- Email
- Password
- Sign in

### 2. Dashboard
Header:
- Gym name
- Owner profile/menu

KPI cards:
- Today's Collection
- Pending Amount
- Active Members
- Due Today

Main:
- Due Today
- Overdue
- Recent Payments

Primary action:
`Add Member`

### 3. Members
Search:
- Name
- Phone

Filters:
- All
- Paid
- Due
- Overdue

Member row/card:
- Name
- Phone
- Plan
- Amount
- Due date
- status
- Mark Paid
- WhatsApp

### 4. Member Details
- Personal information
- Current membership
- outstanding amount
- next due date
- payment history
- actions

### 5. Plans
Cards/table:
- plan name
- duration
- price
- active status
- edit
- deactivate
- add plan

### 6. Registrations
- New registrations
- customer name
- phone
- selected plan
- submitted date
- payment pending
- Convert to Member

### 7. QR
- Gym QR preview
- Download/print
- Copy onboarding link
- Instructions: place at reception

## Customer Screens

### `/join/[gymSlug]`
Step 1:
Name / Phone / Email

Step 2:
Plan selection

Step 3:
Review + Register

Step 4:
Success

Do not expose owner dashboard navigation or private gym data.

## Interaction Rules
- Mark Paid should be the strongest primary action on due/overdue rows.
- Confirm destructive/financial actions.
- Show loading state during mutations.
- Disable action while submitting.
- Use optimistic UI only when rollback is reliable; otherwise refresh from server.
- Show clear success/error toast.
