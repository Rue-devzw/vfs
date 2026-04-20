# Daily Reconciliation Operating Procedure

This document is the operational playbook for daily sales, collections, delivery, refund, digital, and inventory reconciliation in VFS.

Use this procedure together with:

- `/admin/reconciliation`
- `/admin/payments`
- `/admin/shipments`
- `/admin/refunds`
- `/admin/digital`
- `/admin/notifications`
- `/admin/audit`

## Purpose

The goal of daily reconciliation is to ensure that:

1. Every sale is matched to a valid collection state.
2. Every collected order is matched to the correct fulfilment or delivery state.
3. Every refund exception is owned and followed through.
4. Every digital service exception is visible and actively managed.
5. Every stock variance is recorded in the inventory movement ledger.
6. The trading day is either left `open`, marked `reconciled`, or `locked` with clear operator accountability.

## Roles

Assign these roles every business day, even if one person covers more than one role.

### Duty Manager

- owns the daily close
- decides whether the day can be marked `reconciled`
- approves lock only after exception review

### Finance Operator

- reviews collections, payment mismatches, and refund workload
- confirms external settlement evidence where available
- records close notes for unresolved finance exceptions

### Dispatch Lead

- reviews courier assignment, dispatch readiness, and proof-of-delivery gaps
- clears delivery-side exceptions before close where possible

### Digital Ops Lead

- reviews digital manual-review and failed fulfilment cases
- reprocesses or escalates provider issues

### Stock Controller

- records physical count variances
- investigates negative availability or unusual reservation movement

## Systems of Record

Treat the following as the operational control sources:

- `orders`: commercial sale record
- `payment_intents`, `payment_events`, `webhook_inbox`: collections record
- `shipments`, `orders.shipping`: fulfilment and delivery record
- `refund_cases`, `refund_executions`: refund exception record
- `digital_orders`: digital fulfilment record
- `inventory_movements`: stock movement ledger
- `reconciliation_batches`: day-close record
- `reconciliation_exception_assignments`: ownership record
- `audit_logs`: operator traceability

## Daily Cadence

Run the procedure in three waves:

1. Opening review
2. Intraday control checks
3. End-of-day close

If the operation is high-volume, repeat the intraday checks more often.

## 1. Opening Review

Run this at the start of the business day.

### Step 1: Open the reconciliation board

1. Go to `/admin/reconciliation`.
2. Confirm the latest batch status from the previous day.
3. If yesterday is still `open`, review the notes before proceeding.

### Step 2: Sync the current business date

1. Set today’s business date.
2. Click `Sync Batch`.
3. Confirm the summary cards load:
   - sales
   - collected
   - delivered
   - exceptions
   - inventory variances

### Step 3: Review unowned exceptions

1. In `Open Exceptions`, identify rows with `Unassigned`.
2. Claim each exception into the correct operational owner.
3. Do not leave critical exceptions unowned.

### Step 4: Check overnight backlogs

Review these screens in order:

1. `/admin/payments`
   - payment mismatches
   - failed webhook processors
2. `/admin/shipments`
   - unassigned delivery
   - missing proof
3. `/admin/refunds`
   - queued
   - manual review
   - failed
4. `/admin/digital`
   - manual review
   - failed
5. `/admin/notifications`
   - failed or queued notifications

### Opening Rule

Do not treat the day as operationally clean until every overnight critical exception has:

- an owner
- a note or action plan
- a next step

## 2. Intraday Control Checks

Run this at least twice during the trading day.

Recommended checkpoints:

- midday
- two hours before close

### A. Sales vs Collections

Screen: `/admin/payments`

Check:

1. `Reconciliation alerts`
2. `Webhook failures`
3. `Paid awaiting dispatch`

Action rules:

- If order status and payment intent do not match, claim the exception in `/admin/reconciliation`.
- If a webhook failed, investigate whether the order state already updated through another path.
- If not, escalate to finance or engineering support.

### B. Collections vs Delivery

Screen: `/admin/shipments`

Check:

1. `Unassigned delivery`
2. `Ready for dispatch`
3. `Out for delivery`
4. `Missing proof`
5. `Delivery issues`

Action rules:

- No delivery order should move `out for delivery` without a courier.
- No delivery order should be marked `delivered` without proof of delivery.
- If proof is still missing, keep ownership on the dispatch lead until captured or formally explained.

### C. Refund Exceptions

Screen: `/admin/refunds`

Check:

1. queued executions
2. manual-review executions
3. failed executions
4. aged queued workload

Action rules:

- Any refund still `queued` by the second intraday check must be investigated.
- Any `manual_review` refund must have a note describing the next external action.
- Any `failed` refund is a same-day exception unless explicitly deferred by the duty manager.

### D. Digital Fulfilment

Screen: `/admin/digital`

Check:

1. pending
2. processing
3. manual review
4. failed

Action rules:

- Paid digital orders should either complete or enter managed manual review quickly.
- Reprocess only when the provider issue is believed to be transient.
- If not transient, add a note and keep the case owned until customer communication is complete.

### E. Inventory Control

Screen: `/admin/reconciliation`

Check:

1. inventory exceptions
2. recent stock movements
3. count variances

Action rules:

- Any negative available quantity without approved backorder must be investigated.
- Record physical count variances immediately using `Record Stock Count`.
- Use the stock ledger export when finance or stock control needs a movement pack.

## 3. End-of-Day Close

Run this after order intake closes or at the agreed close time.

### Step 1: Run final operational sweep

Review:

- `/admin/reconciliation`
- `/admin/payments`
- `/admin/shipments`
- `/admin/refunds`
- `/admin/digital`

Confirm that every remaining exception has:

- an owner
- a current note
- a business reason if it cannot be resolved the same day

### Step 2: Export exception packs

From `/admin/reconciliation`, export:

1. `Exceptions CSV`
2. `Stock Ledger CSV`

Use these when the team needs:

- finance review
- stock controller sign-off
- management pack
- audit evidence

### Step 3: Record close notes

In the daily close section:

1. enter notes covering:
   - unresolved payment mismatches
   - delivery items waiting on proof
   - open refunds
   - digital manual-review cases
   - count variances
2. include external evidence references where available
   - settlement advice
   - courier manifest
   - provider ticket
   - branch count sheet

### Step 4: Mark the batch reconciled

Use `Mark Reconciled` only when:

1. all critical exceptions are either resolved or formally owned
2. all proofs required for completed deliveries have been captured or explained
3. refund and digital backlogs have same-day notes
4. stock variances have been recorded

### Step 5: Lock the batch

Use `Lock Batch` only when the duty manager is satisfied that:

1. the close notes are complete
2. the exception count is understood
3. no further routine same-day edits should happen

### Lock Rule

Do not lock a batch just because trading has ended. Lock only when the day’s control state is clear and attributable.

## Exception Handling Standards

### Payment Exceptions

Owner: Finance Operator

Same-day expectation:

- identify whether the issue is webhook lag, payment drift, or order-state mismatch
- document the corrective action

### Dispatch Exceptions

Owner: Dispatch Lead

Same-day expectation:

- assign courier
- capture route note
- update shipment state

### Proof-of-Delivery Exceptions

Owner: Dispatch Lead

Same-day expectation:

- capture proof URL
- or record why delivery cannot yet be treated as complete

### Refund Exceptions

Owner: Finance Operator

Same-day expectation:

- move queued items into clear execution/manual-review handling
- keep failed items visible until resolved or formally deferred

### Digital Exceptions

Owner: Digital Ops Lead

Same-day expectation:

- reprocess if appropriate
- or document provider/manual-review action

### Inventory Exceptions

Owner: Stock Controller

Same-day expectation:

- record count variance
- investigate negative availability
- provide note for unusual shrinkage or receiving differences

## Escalation Rules

Escalate to the duty manager immediately if:

1. a paid order is shipped or delivered while payment state is inconsistent
2. a delivered order has no proof and cannot be corrected the same day
3. a refund is customer-critical and still unresolved after manual review
4. a digital paid order remains unresolved and customer follow-up is overdue
5. a stock variance suggests theft, major receiving error, or repeated process failure

Escalate to engineering support if:

1. webhook failures repeat
2. exports fail
3. batch sync fails
4. shipment status rules block a valid operational case unexpectedly
5. ledger or movement records look incomplete

## Daily Sign-Off Checklist

Before the duty manager signs off, confirm:

- today’s batch exists
- today’s batch is synced
- all critical exceptions are owned
- close notes are written
- required exports are available
- the batch is marked `reconciled`
- the batch is `locked` when appropriate

## Minimum Evidence Pack

For a premium operating standard, retain:

1. reconciliation batch record
2. exception CSV
3. stock ledger CSV if variances occurred
4. close notes
5. audit trail for key actions

## Weekly Review

Once per week, review:

1. repeated exception types
2. same-owner bottlenecks
3. repeated proof-of-delivery gaps
4. repeated payment mismatch patterns
5. repeated digital provider issues
6. stock variance trends

Use that review to decide whether the issue is:

- people
- process
- system
- provider

## Current Known Limitation

The close workflow is now operationally complete inside the app, but external bank/gateway settlement-file ingestion is still not automated in this repository.

Until that exists:

- finance should reference external settlement evidence in close notes
- unresolved settlement confirmation should remain visible in the batch notes
