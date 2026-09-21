# Phase 15 — Church Donations, Tithes & Offering Management

Secure financial contributions for Busa Mekene Eyasus Church.

This project uses **Next.js App Router + Prisma + SQLite** (not Django/PostgreSQL). Amounts use Prisma `Decimal` (never floating-point money).

## Security rules

Never stored:

- Card numbers, CVV, PIN, banking passwords
- Payment-provider secret keys in the database
- Full sensitive webhook payloads

The app stores only reconciliation fields: amounts, currency, status, references, provider transaction ids.

## Payment provider abstraction

```
PaymentService / write helpers
        ↓
PaymentProvider
  ├── manual (offline)
  ├── signed_dev (HMAC webhook tests)
  └── ethiopia_ready / chapa / telebirr aliases (await official API wiring)
```

Configure with environment variables:

```
PAYMENT_PROVIDER=manual
PAYMENT_WEBHOOK_SECRET=
PAYMENT_MERCHANT_ID=
PAYMENT_API_KEY=
```

Do **not** invent Ethiopia provider APIs. When merchant credentials and official docs are available, implement a real adapter behind the same interface.

Frontend payment status is never trusted. Verified webhooks (or authorized offline recording) are the source of truth for successful online gifts.

Webhook: `POST /api/v1/payments/webhook/{provider}`

Idempotency:

- Contribution `idempotencyKey`
- PaymentTransaction `idempotencyKey`
- Unique `(provider, providerReference)`
- Unique webhook `(provider, eventKey)`

## Models

- `DonationCategory` — configurable types (tithe, offering, …)
- `DonationCampaign` — draft/active/paused/completed/archived
- `Contribution` — donor gift + status + receipt number
- `PaymentTransaction` — provider attempt
- `ContributionRefund` — audited refunds
- `Pledge` — intent only; never auto-charged without provider subscriptions
- `PaymentWebhookEvent` — processing audit
- `ReceiptSequence` — `BME-REC-000001` style numbers (prefix configurable)

Only `successful` and net `partially_refunded` amounts count toward campaign and dashboard totals.

## Routes

**Public:** `/give`, `/give/campaigns`, `/give/campaigns/[slug]`, `/give/receipt/[reference]`

**Member:** `/member/giving`, `/member/giving/history`

**Admin:** `/admin/giving`, `/admin/giving/contributions`, `/admin/giving/campaigns`, `/admin/giving/record`

## Permissions (`giving`)

| Spec | RBAC action |
|------|-------------|
| view | view |
| create | create (offline + initiate) |
| update | update |
| manage_campaigns | publish |
| manage_payments | moderate |
| manage_refunds | cancel |
| view_reports | view |
| export / manage | manage |

Website `member` role has none of these. Donors see only their own history.

## Currency

Supported currencies are configurable via `ChurchGivingSettings` (default **ETB**). Currency is explicit on every contribution. **No silent conversion.**

See also: [Phase 28 online giving](./online-giving.md) for funds admin, QR links, statements, and provider configuration.
