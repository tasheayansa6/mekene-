# Phase 20 — Church Finance, Donations & Financial Administration

Extends Phase 15 giving. Donations, payments, webhooks, receipts, campaigns, and pledges remain in `src/lib/giving/`. Phase 20 adds expenses, budgets, ledger, reconciliation, finance dashboard, and giving schedules.

## Source of truth

| Layer | Role |
|-------|------|
| `PaymentTransaction` | Provider payment state |
| `Contribution` | Giving record + receipt |
| `FinancialEntry` | Accounting ledger (posted income/expense/refund/adjustment) |
| `Reconciliation` | Period matching against statements — does not mutate history |

Payment provider success ≠ reconciled. Only **posted** ledger entries feed reports.

## Money

ETB Decimal helpers in `src/lib/giving/money.ts` — no floating-point math.

## Giving (Phase 15, reused)

- Funds: `DonationCategory`
- Donations: `Contribution` + `PaymentTransaction`
- Webhooks: `PaymentWebhookEvent` unique `(provider, eventKey)`
- Receipts: `BME-REC-######`
- References: gift refs from `receipts.ts`
- Providers: `manual`, `signed_dev`, Ethiopia-ready stubs (`chapa`/`telebirr` need official credentials)

Successful contributions and refunds post idempotent `FinancialEntry` rows (`BME-LED-######`).

## Expenses

Workflow: draft → submitted → under_review → approved → paid (or rejected/cancelled).

Separation of duties: submitter cannot approve their own expense unless `finance:manage`.

Paid expenses post ledger expense entries.

## Budgets

Period: monthly / quarterly / annual. Actuals from posted ledger entries in range.

## Reconciliation

Open → in_progress → reconciled / disputed → closed. Matches reference external lines to contributions; differences are displayed, not silently fixed.

## Giving schedules

`GivingSchedule` architecture for member recurring giving. Provider recurring tokens are optional stubs until an official provider supports them (`supportsRecurring` remains false on current adapters).

## RBAC

| Permission | Use |
|------------|-----|
| `finance:view` | Dashboard, reports, ledger read |
| `finance:create` | Submit expenses, create budgets |
| `finance:update` | Edit/submit workflow |
| `finance:moderate` | Approve/reject expenses |
| `finance:manage` | Pay, reconcile, export, override SoD |

Roles: `finance` (full), `finance_auditor` (view only), `admin` (finance ops). Members: own giving + schedules only.

## Routes

**Admin:** `/admin/finance`, `/expenses`, `/budgets`, `/reconciliation`, `/reports`, `/ledger`  
**Member:** `/member/giving`, `/member/giving/schedules`, receipts  
**Public:** `/give`, `/give/campaigns/[slug]` (unchanged)

## APIs

- `/api/v1/admin/finance/*` — overview, expenses, budgets, reconciliations, ledger, reports
- `/api/v1/giving/*` — existing donations + `/schedules`
- `/api/v1/payments/webhook/[provider]` — existing idempotent webhooks

## Privacy

Aggregates on finance dashboard. No public donor lists or rankings. Anonymous donations stay anonymous in member-facing views. Notifications are generic (“You have a new giving receipt.”).

## Env (unchanged)

`PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET`, optional merchant keys — server only.

## Tests

- `npm run test:finance`
- `npm run test:giving`
- `npm run test:giving:api` / `test:finance:api` when server running
