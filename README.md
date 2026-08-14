# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Store API

The storefront data is also available through dedicated API routes designed for the upcoming Flutter client. Refer to [docs/store-api.md](docs/store-api.md) for endpoint descriptions, Firestore setup instructions, and deployment guidance.

## Product image storage

Images uploaded from the admin product create/edit form are committed to GitHub. Configure these server-side environment variables locally and in the deployed app:

```bash
GITHUB_IMAGE_TOKEN=<fine-grained-token-with-contents-write-access>
GITHUB_IMAGE_REPOSITORY=Rue-devzw/vfs-product-images
GITHUB_IMAGE_FOLDER=products
GITHUB_IMAGE_BRANCH=main
```

Create the image repository separately before enabling uploads; do not use the application repository (`Rue-devzw/vfs`). `GITHUB_IMAGE_TOKEN` and `GITHUB_IMAGE_REPOSITORY` are required. The folder defaults to `products`; when the branch is omitted, GitHub uses the image repository's default branch.

The image repository must be public because product records use `raw.githubusercontent.com`. Each stored URL is pinned to the exact Git commit created by its upload—not to a moving branch—so future application deployments, code syncs, and ordinary GitHub commits cannot change an existing product image. Uploading or replacing a product image is the only operation that adds an image commit. The uploader never overwrites or deletes an existing image. Existing Google-hosted URLs remain readable.

## Smile&Pay (ZB) Integration

This project uses Smile&Pay (ZB) for payments. Add the following environment variables to your `.env.local` file:

```
ZB_API_KEY=<your-zb-api-key>
ZB_API_SECRET=<your-zb-api-secret>
ZB_API_BASE_URL=<optional-override>
ZB_EXCHANGE_RATE_BASE_URL=https://zbnet.zb.co.zw
ZB_EXCHANGE_RATE_USERNAME=<exchange-rate-adapter-username>
ZB_EXCHANGE_RATE_PASSWORD=<exchange-rate-adapter-password>
NEXT_PUBLIC_BASE_URL=<your-base-url>
```

USD/ZWG conversions use the ZB Exchange Rate Adapter at runtime. Adapter credentials are server-only; the storefront receives only the current rate through `/api/exchange-rate`.

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
