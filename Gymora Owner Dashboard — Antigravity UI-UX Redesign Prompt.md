GYMORA — PRODUCT ARCHITECTURE + UX + MEMBER + QR + SETTINGS + AUTOMATION REWORK

IMPORTANT:
You are working on the existing Gymora repository.

Repository:
https://github.com/starkshashwat/gymora

Do NOT create a parallel/mock implementation.

First inspect the complete repository and understand the existing:
- Next.js 14 App Router structure
- Supabase setup
- PostgreSQL schema
- migrations
- RLS policies
- RPC functions
- authentication
- owner dashboard
- members
- member detail
- payments
- plans
- registrations
- public QR onboarding
- existing WhatsApp click-to-chat implementation
- current onboarding wizard
- current gateway configuration
- existing tests
- existing UI components
- current local working UI

Read:
01_PRD.md
02_SYSTEM_ARCHITECTURE.md
03_DATABASE_SCHEMA.sql
04_RLS_SECURITY.md
05_USER_FLOWS.md
06_API_AND_BACKEND_CONTRACT.md
07_UI_SCREEN_SPEC.md
08_IMPLEMENTATION_PLAN.md
09_TEST_CASES.md
10_ENV_AND_DEPLOYMENT.md
11_AGENT_INSTRUCTIONS.md

Also inspect all current source files before modifying anything.

The screenshots supplied with this task represent the desired UX direction. Do not blindly copy the screenshots. Reconcile them with the actual current codebase.

==================================================
CORE PRODUCT PRINCIPLE
==================================================

Gymora is a simple gym-owner operations system.

The primary user is a non-technical gym owner/receptionist.

Every screen must answer:

"What do I need to know?"
"What do I need to do?"
"What is the next action?"

Do not build an analytics-heavy SaaS.

Do not add AI-looking UI.

Do not add decorative gradients, excessive glassmorphism, giant cards, excessive shadows, unnecessary charts, fake AI insights, or meaningless metrics.

Keep the UI:
- clean
- professional
- fast
- obvious
- mobile-first
- operational
- easy for non-technical users

==================================================
1. REDESIGN ONBOARDING
==================================================

CURRENT PROBLEM:

The current onboarding wizard asks the owner to configure:
- payment mode
- payment gateway
- API credentials
- WhatsApp mode
- Facebook/WABA information
- plans
- member import

This is too technical.

REMOVE PAYMENT GATEWAY CONFIGURATION FROM ONBOARDING.

REMOVE WHATSAPP API CONFIGURATION FROM ONBOARDING.

REMOVE API keys/secrets from onboarding.

REMOVE gateway verification from onboarding.

REMOVE Facebook/WhatsApp connection simulation from onboarding.

NEW ONBOARDING:

Step 1:
Gym Details
- Gym name
- Owner/contact phone
- Email if appropriate
- Address
- Gym slug/subdomain
- Logo optional

Step 2:
Membership Plans
- Create initial plans
- Name
- Price
- Duration
- Description
- Image/banner

Allow:
- Add plan
- Edit plan
- Remove plan

Step 3:
Existing Members
- Optional Excel import
- Skip option

Step 4:
Finish

Then immediately enter:

/dashboard

The owner should NOT need to understand:
- API keys
- webhooks
- WABA IDs
- phone number IDs
- gateway secrets

during onboarding.

==================================================
2. ADD SETTINGS
==================================================

Add a proper Settings entry to the owner navigation.

Settings should be a central configuration area.

Sections:

A. General
- Gym name
- Logo
- Phone
- Email
- Address
- Public slug/subdomain
- Public QR URL

B. Payments

Section 1:
Manual Payments

Supported methods:
- Cash
- UPI
- Local QR
- Other

Allow the owner to configure:
- UPI ID
- Local QR image
- payment instructions

Section 2:
Online Payment Gateway

Providers:
- Razorpay
- PhonePe
- Cashfree
- Paytm

Show each provider as:
- Not connected
- Connected
- Connection error

Do NOT require gateway configuration during onboarding.

The settings page should allow future connection/setup.

IMPORTANT SECURITY:
Do not expose payment secrets to the client.
Do not store secrets in publicly readable tables.
Do not expose gateway secrets through normal SELECT queries.
Use server-only secure storage/encryption appropriate to the current Supabase architecture.

Use webhooks for provider payment state updates.

Payment gateway integration must update the existing immutable payment records.

Do not duplicate payment logic.

==================================================
3. WHATSAPP SETTINGS
==================================================

Add:

Settings → WhatsApp

Two clearly separated modes:

A. Manual WhatsApp

Description:
"Send messages manually using WhatsApp."

Keep the existing WhatsApp click-to-chat/deep-link functionality.

B. WhatsApp Business

Description:
"Automate payment reminders, payment confirmations and membership updates."

Status:
- Not connected
- Connected
- Error

Primary CTA:
Connect WhatsApp Business

DO NOT implement WhatsApp Web/device-link browser automation.

Prepare the architecture for official WhatsApp Business Platform / Cloud API integration.

Do not pretend a fake Meta connection exists.

If integration is not actually configured, show:
"Not connected"

not fake success.

==================================================
4. WHATSAPP TEMPLATE ARCHITECTURE
==================================================

Create a future-ready template system.

Important:
WhatsApp Business Platform business-initiated messages require approved templates.

Therefore Gymora should NOT pretend that local text templates are automatically equivalent to Meta-approved templates.

Create a template mapping layer.

Example:

Payment Due Reminder
Meta template:
gym_payment_due

Variables:
- member_name
- gym_name
- amount
- due_date
- payment_link if available

Template status:
- Not configured
- Pending
- Approved
- Rejected
- Paused

Allow:
- View template
- Map template to automation
- Open/manage template externally where appropriate

Do not build a fake WhatsApp approval system.

==================================================
5. REMINDER / AUTOMATION ENGINE
==================================================

Create a generic reminder workflow architecture.

IMPORTANT:
Do not hard-code the system directly into WhatsApp.

Architecture:

EVENT
→ AUTOMATION RULE
→ CONDITIONS
→ TEMPLATE
→ CHANNEL
→ DELIVERY

Example:

Membership due
→ 3 days before
→ member has WhatsApp opt-in
→ payment_due template
→ WhatsApp

Create Settings → Reminders & Automations.

Initial triggers:

1. Registration submitted
2. Registration approved
3. Payment received
4. Partial payment received
5. Payment due soon
6. Payment due today
7. Payment overdue
8. Membership expiring soon
9. Membership expired
10. Membership cancelled

Each rule should support:

- enabled/disabled
- event
- timing offset
- template
- channel
- conditions
- stop conditions
- maximum sends
- retry policy

Examples:

Payment Due:
3 days before

Payment Due:
1 day before

Payment Due:
on due date

Payment Overdue:
3 days after due date

Payment Overdue:
7 days after due date

Do not automatically enable aggressive reminders.

Owner should control automation.

==================================================
6. WHATSAPP OPT-IN
==================================================

Because WhatsApp messaging requires recipient opt-in:

Add appropriate member-level fields for:
- whatsapp_opt_in
- whatsapp_opted_in_at
- whatsapp_opt_out
- whatsapp_opted_out_at

The public registration flow should include a clear WhatsApp consent option.

Example:

[ ] I agree to receive membership and payment updates from
{Gym Name} on WhatsApp.

Do not pre-check it.

Respect opt-out.

Automation must never send WhatsApp messages when opt-out is active.

Keep manual click-to-chat available separately.

==================================================
7. MEMBER LIST REDESIGN
==================================================

The Members page must be understandable to a non-technical gym owner.

Do not show unnecessary database information.

Each member row/card should clearly show:

Name
Phone
Email if available

Current Plan
Member Since

Last Payment
Next Payment / Due Date

Outstanding Amount

Current status:
- Paid
- Due
- Overdue
- Partial
- Cancelled
- Expired

Actions:

WhatsApp
Mark Paid
More

Do not hide Mark Paid inside a three-dot menu.

Mark Paid must remain a primary action.

Use simple hierarchy.

Desktop:
compact horizontal member row.

Mobile:
stacked card.

Do not turn every field into a separate giant card.

==================================================
8. MEMBER DETAIL PAGE
==================================================

The member detail page should become a member operations page.

Top:

Name
Status
Phone
Email
Member since

Primary actions:
- WhatsApp
- Mark Paid
- More

Remove the prominent Delete button.

Do NOT encourage deleting members.

The More menu should contain:

- Edit Member
- Change Plan
- Pause Membership
- Cancel Membership
- Reactivate Membership

If data retention requires deletion in backend for admin/debug purposes, keep it out of the normal member workflow.

Financial records must remain preserved.

==================================================
9. MEMBERSHIP CANCELLATION
==================================================

Do NOT treat cancellation as deletion.

Add a membership lifecycle state separate from payment state.

Payment status and membership lifecycle are different concepts.

Example lifecycle:

active
paused
cancelled
expired

Payment state:

pending
partial
paid
overdue
refunded
void

Do not overload one enum for both concepts.

When cancelling:

- mark current membership as cancelled
- mark member inactive where appropriate
- preserve payment history
- preserve membership history
- create audit log
- do not delete financial records

Reactivation should create or activate the correct membership cycle according to business rules.

Prefer creating a new membership cycle rather than mutating historical financial data.

==================================================
10. AUTO-CANCELLATION AFTER OVERDUE
==================================================

Add:

Settings → Membership Rules

Configuration:

Automatically cancel unpaid memberships after:

- Never
- 3 days
- 7 days
- 14 days
- 30 days
- Custom

Do not hard-code this behavior.

The system should:

Due
→ Overdue
→ Grace period
→ Cancelled

Before cancellation:
- create audit event
- optionally enqueue reminder automation
- do not delete the member

After cancellation:
- member remains searchable
- history remains visible
- new membership can be created later

==================================================
11. MEMBER INFORMATION MODEL
==================================================

The member detail/list experience should expose:

Identity:
- full_name
- phone
- email

Membership:
- current plan
- plan price
- start date
- member since
- end date
- next payment date

Financial:
- total cycle amount
- paid so far
- outstanding
- last payment date
- last payment method

History:
- payment history
- previous membership cycles

Use existing fields where possible.

Add only the fields actually needed.

==================================================
12. PUBLIC QR / PLAN EXPERIENCE
==================================================

Keep the existing public:

/join/[slug]

architecture.

Public users should only receive public gym data and active plan data.

Never expose:
- members
- payments
- owner data
- private notes
- API credentials
- private settings

Improve public plan cards.

Each plan should support:

- image/banner
- name
- price
- duration
- description
- included facilities/features

Add:

image_url

to membership plans.

Use Supabase Storage for plan images.

Recommended display ratio:
16:9

Optimize uploaded images.

Public QR should show the plan image prominently.

==================================================
13. QR REGISTRATION APPROVAL
==================================================

Current flow is:

QR submission
→ Approve & Convert to Member

Change this.

Create:

Review Registration

Show all submitted information:

- Name
- Phone
- Email
- Selected plan
- Plan price
- Registration date

Then:

Payment Received?

YES / NO

If YES:

Amount Received
Payment Method:
- Cash
- UPI
- Local QR
- Other
- Gateway

Allow partial payment.

Show:

Plan Amount
Amount Received
Remaining Balance

Then:

Approve & Create Member

This action must be transactional.

It should create:

registration conversion
→ member
→ membership
→ payment if applicable

without creating duplicates.

If payment is not received:
create the member with pending balance.

Do not force the owner to re-enter:
- name
- phone
- email
- plan
- plan price

All of these should come from the QR registration request.

==================================================
14. LOCAL QR PAYMENT FLOW
==================================================

If the gym uses its own merchant QR:

Do not require:
- gateway API
- API keys
- webhook
- provider credentials

The owner simply configures:

UPI ID
Local QR image
Payment instructions

in Settings.

Public QR flow may show the gym's local QR/payment instructions.

However:
Do not automatically mark a payment as verified merely because a user says "I paid".

For manual/local QR payments:
owner verification remains the source of truth.

==================================================
15. ONLINE PAYMENT FLOW
==================================================

Prepare architecture for:

Public QR
→ Select plan
→ Online payment
→ Payment provider
→ Provider webhook
→ Gymora server
→ Verify payment
→ Create/update payment
→ Update membership balance/status

Provider payment IDs must be stored.

Webhook processing must be:
- authenticated
- idempotent
- duplicate-resistant
- server-side

Never trust a client-side success screen as the financial source of truth.

==================================================
16. SUPABASE AS SOURCE OF TRUTH
==================================================

IMPORTANT CURRENT CODEBASE ISSUE:

Some current service/dbSync flows update the in-memory service first and then attempt to synchronize with Supabase.

For production flows, Supabase PostgreSQL must be the source of truth.

Refactor carefully so:

UI
→ server route/action
→ Supabase transaction/RPC
→ response

Mock/in-memory data should only be used for:
- demo mode
- tests

Do not allow production financial state to silently succeed only in memory.

==================================================
17. TRANSACTIONS / IDEMPOTENCY
==================================================

The following operations must be atomic:

- Mark Paid
- Partial Payment
- Registration Approval
- Member Creation
- Membership Cancellation
- Gateway Payment Webhook

Double click must never create duplicate payments.

Duplicate webhook delivery must never create duplicate payment records.

Use database constraints / idempotency keys where appropriate.

Preserve immutable financial history.

==================================================
18. SECURITY
==================================================

Review the existing migration and security model.

Do not expose:
- gateway secrets
- WhatsApp access tokens
- private provider credentials

through client-side queries.

Do not store sensitive tokens in ordinary client-readable gym objects.

Maintain strict gym_id tenant isolation.

Every owner query must resolve the authenticated owner's gym.

Public QR endpoints must expose only:
- gym public profile
- active public plans
- public plan images
- registration creation

Never expose:
- private members
- payments
- private settings
- credentials

==================================================
19. SIDEBAR / NAVIGATION
==================================================

Keep navigation simple.

Recommended:

Overview
Members
Registrations
Payments
Plans
Gym QR

----------------

Settings

If Payments does not have enough independent functionality yet, do not create unnecessary duplicate screens.

Settings contains:
- General
- Payments
- WhatsApp
- Reminders
- Membership Rules

==================================================
20. DASHBOARD
==================================================

Continue the previously defined dashboard philosophy.

Dashboard is the daily operations control center.

Top:
Gym name / date
Add Member

Primary:
Today's Collection

Secondary:
Due Today
Overdue
Active Members

Main:
Needs Attention

Show:
- overdue members
- due today members

Direct actions:
- WhatsApp
- Mark Paid

Then:
Recent Payments

Optional:
small collection trend

Do not make the dashboard an analytics wall.

==================================================
21. UI / UX
==================================================

Visual language:

- clean white/neutral surfaces
- subtle borders
- restrained shadows
- moderate radius
- strong typography
- high readability
- no unnecessary gradients
- no glassmorphism
- no decorative blobs
- no fake AI UI
- no excessive rounded containers
- no excessive animations

Animation:

Use Framer Motion only when it improves clarity.

Preferred:
180–250ms transitions
4–8px subtle movement
button loading states
modal fade/scale
row hover

Avoid:
bouncy animations
dramatic entrance animations
large parallax
long chart animations

All important actions must have:
- loading state
- success state
- error state
- disabled state where appropriate

==================================================
22. RESPONSIVE
==================================================

Test:

1440px
1280px
1024px
768px
430px
375px

No horizontal overflow.

Mobile priorities:

1. Collection
2. Add Member
3. Due
4. Overdue
5. Needs Attention
6. Members
7. Recent payments
8. Secondary settings

==================================================
23. DATA MIGRATION
==================================================

Do not break existing production data.

Create proper Supabase migrations.

Before changing enums or columns:
- inspect existing migrations
- preserve existing records
- backfill new fields
- add compatibility logic where necessary

Do not simply replace the existing database schema.

==================================================
24. TESTING
==================================================

Add/update tests for:

Member:
- member creation
- plan association
- last payment
- next payment
- outstanding calculation

Payment:
- full payment
- partial payment
- duplicate Mark Paid
- payment history

Cancellation:
- manual cancellation
- automatic cancellation
- grace period
- reactivation

Registration:
- public registration
- approval
- approval with cash
- approval with UPI
- approval with local QR
- partial payment
- no payment
- duplicate approval

Plans:
- plan image upload
- public image display

Security:
- cross-gym access blocked
- public QR cannot access private data
- secrets never exposed

Automation:
- trigger evaluation
- disabled rule
- opt-out
- duplicate prevention
- cancellation stops future reminders

==================================================
25. IMPORTANT IMPLEMENTATION ORDER
==================================================

Do NOT implement everything randomly.

First:

1. Audit current architecture
2. Audit current DB/RLS
3. Fix production source-of-truth issues
4. Refactor onboarding
5. Add Settings architecture
6. Improve membership model
7. Improve Members UI
8. Improve Member Detail
9. Improve Registration Approval
10. Add Plan Images
11. Add Membership Rules
12. Add generic Reminder/Automation engine
13. Keep WhatsApp Business integration as a provider boundary
14. Keep payment gateway as a provider boundary
15. Add tests
16. Run complete QA

==================================================
26. DO NOT IMPLEMENT THESE NOW
==================================================

Do NOT implement:
- WhatsApp Web browser automation
- WhatsApp device linking automation
- fake Meta OAuth
- fake WABA connection
- fake gateway success
- fake payment verification
- customer dashboard
- customer mobile app
- attendance
- trainers
- workout plans
- advanced analytics
- unnecessary AI features

The architecture should be ready for WhatsApp Business API and payment gateways later, but the current system must work correctly without them.

==================================================
FINAL ACCEPTANCE CRITERIA
==================================================

A non-technical gym owner should be able to:

1. Sign up
2. Create gym
3. Create plans
4. Enter dashboard
5. Print/share QR
6. Receive QR registration
7. Review the person's details
8. Select how payment was received
9. Approve the registration
10. See the member automatically created
11. See plan/payment/due information without re-entering anything
12. Mark future payments in one action
13. Cancel a membership without deleting history
14. Configure local QR from Settings
15. Configure payment gateway later from Settings
16. Configure WhatsApp later from Settings
17. Configure reminder rules later from Settings

The owner should not need technical knowledge to use the core product.

Most importantly:

DO NOT BUILD A BEAUTIFUL SYSTEM THAT IS HARD TO USE.

Build the simplest operational system possible.

Make it obvious.