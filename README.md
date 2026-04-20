# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Store API

The storefront data is also available through dedicated API routes designed for the upcoming Flutter client. Refer to [docs/store-api.md](docs/store-api.md) for endpoint descriptions, Firestore setup instructions, and deployment guidance.

## Smile&Pay (ZB) Integration

This project uses Smile&Pay (ZB) for payments. Add the following environment variables to your `.env.local` file:

```
ZB_API_KEY=<your-zb-api-key>
ZB_API_SECRET=<your-zb-api-secret>
ZB_API_BASE_URL=<optional-override>
NEXT_PUBLIC_BASE_URL=<your-base-url>
```

### Testing

Use your own Smile&Pay sandbox credentials for local testing.  
Sandbox base URL from the Smile&Pay docs: `https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway`

### Webhooks

Configure the following URLs in Smile&Pay:

- Result URL: `https://<your-base-url>/api/payments/webhook/smile-pay`
- Return URL: `https://<your-base-url>/store/smile-pay/return`

## Operations Runner

Background operational maintenance can be run locally with:

```bash
npm run ops:maintain
```

For scheduled environments, configure `OPS_CRON_SECRET` and call:

- `POST /api/ops/maintenance`
- Header: `Authorization: Bearer <OPS_CRON_SECRET>` or `x-ops-secret: <OPS_CRON_SECRET>`

The maintenance runner processes queued notifications, releases expired inventory reservations, advances queued refund execution records, and escalates stale digital fulfilment orders into manual review.
