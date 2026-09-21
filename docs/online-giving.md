# Phase 28 — Online Giving, Donations & Financial Management

Extends Phases **15** (giving) and **20** (finance). Does not rebuild payment, ledger, refund, or reconciliation systems.

## Architecture

```
Donor → /give/now → Contribution (pending)
                 → PaymentProvider.createCheckout
                 → Provider / signed_dev simulator
                 → Verified webhook
                 → Contribution successful + receipt + ledger entry + notification
```

Frontend redirects are **never** treated as payment success. Only verified webhooks (or authorized offline recording) confirm gifts.

## Reused models

| Concept | Model |
|---------|--------|
| Fund | `DonationCategory` (+ Phase 28: `isPublic`, currencies, presets, ministry/event, accounting code) |
| Donation | `Contribution` (+ `eventId`, `expiresAt`) |
| Campaign | `DonationCampaign` |
| Payment attempt | `PaymentTransaction` |
| Refund | `ContributionRefund` |
| Webhook audit | `PaymentWebhookEvent` |
| Receipt sequence | `ReceiptSequence` (`BME-REC-######`) |
| Ledger | `FinancialEntry` |
| Recurring intent | `GivingSchedule` / `Pledge` |

## Phase 28 additions

| Model | Purpose |
|-------|---------|
| `PaymentProviderConfig` | Non-secret provider settings (secrets stay in env vars) |
| `ChurchGivingSettings` | Giving year, currencies, legal/terms notes |
| `GivingQrLink` | Shareable QR → `/give/q/[slug]` → `/give/now?...` |

## Payment providers

Adapter interface: `src/lib/giving/providers.ts`

- `manual` — offline / bank transfer
- `signed_dev` — HMAC webhook + optional checkout simulator (`/give/checkout/dev`) when `PAYMENT_WEBHOOK_SECRET` is set
- `ethiopia_ready` / `chapa` / `telebirr` — placeholders until official merchant APIs are wired

Admin UI: `/admin/finance/payment-providers`  
Webhook: `POST /api/v1/payments/webhook/{provider}`

Never store card numbers, CVV, PINs, or secret API keys in the database.

## Public routes

| Route | Role |
|-------|------|
| `/give` | Giving hub |
| `/give/now` | Donation form (fund/campaign/ministry/event query params) |
| `/give/campaigns`, `/give/campaigns/[slug]` | Campaigns |
| `/give/success`, `/give/pending`, `/give/cancelled` | Payment outcome pages (status from API) |
| `/give/receipt/[reference]` | Receipt |
| `/give/q/[slug]` | QR redirect |

## Member routes

| Route | Role |
|-------|------|
| `/member/giving` | Summary |
| `/member/giving/history` | History |
| `/member/giving/schedules` | Recurring schedules |
| `/member/giving/statements` | Giving-year statement (own records only) |

## Admin routes

| Route | Role |
|-------|------|
| `/admin/finance/funds` | Fund management |
| `/admin/finance/payment-providers` | Provider config (no secrets) |
| `/admin/finance/qr-links` | QR giving links |
| `/admin/finance/donations` | → contributions |
| Existing `/admin/giving/*`, `/admin/finance/{expenses,budgets,reconciliation,reports,ledger}` | Unchanged |

## Security

- Anonymous cannot access `/giving/my`, statements, admin finance/giving APIs
- Invalid webhooks → 401
- Idempotent webhooks via unique `(provider, eventKey)`
- Campaign progress uses confirmed gifts only
- Anonymous donor identity never shown on public campaign pages

## Env

```
PAYMENT_PROVIDER=manual|signed_dev|ethiopia_ready
PAYMENT_WEBHOOK_SECRET=
PAYMENT_MERCHANT_ID=
PAYMENT_API_KEY=
ALLOW_DEV_CHECKOUT=true   # optional; required to use simulator in production builds
```

## Tests

```bash
npm run test:giving
npm run test:finance
APP_URL=http://localhost:3000 npm run test:giving:api
```
