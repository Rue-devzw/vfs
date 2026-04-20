# Admin and Store Correlation Test Matrix

This matrix is the canonical manual/browser validation set for premium operations.

## Admin Identity and Audit

1. Sign in at `/admin/login` with an operator name or email.
2. Confirm the admin shell shows the operator label and the selected role.
3. Change an order status, retry a notification, or reprocess a digital order.
4. Confirm `/admin/audit` records:
   - `actorLabel`
   - `actorRole`
   - target id
   - event metadata

## Notification Queue and Worker

1. Trigger a customer notification from a store or admin workflow.
2. Confirm `/admin/notifications` shows the record with queued/sent/failed status.
3. Run `npm run ops:maintain` or `POST /api/ops/maintenance`.
4. Confirm the queue drains and `/admin/audit` records an `ops_maintenance_ran` entry.

## Refund Correlation

1. Approve a refund case in admin.
2. Confirm a refund execution record is created immediately.
3. Run the operations runner.
4. Confirm the execution moves out of `queued` into `manual_review` or `completed`.
5. If completed manually, confirm the customer notification and payment intent update are visible.

## Digital Fulfilment Resilience

1. Complete a paid digital order.
2. If the provider succeeds, confirm the storefront shows receipt/token output.
3. If fulfilment remains pending/processing beyond SLA, run the operations runner.
4. Confirm the digital order moves to `manual_review`, the storefront stops polling indefinitely, and `/admin/digital` reflects the escalation.

## Inventory and Reservation Hygiene

1. Create a checkout that reserves stock.
2. Leave the order unpaid until the reservation expires.
3. Run the operations runner.
4. Confirm the reservation is released and stock counts reconcile in admin.

## Payments and Reconciliation

1. Complete a store payment flow.
2. Confirm the payment intent, payment event, and order status reconcile in `/admin/payments`.
3. Confirm the customer account view and the admin order record reflect the same status.

## Recommended Browser Coverage

When Playwright is installed, automate these first:

1. Admin login and operator attribution.
2. Store checkout return to account status.
3. Admin order transition reflected in customer account.
4. Notification retry from admin.
5. Digital order manual-review escalation.
