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

- Result URL: `https://<your-base-url>/api/zb/webhook`
- Return URL: `https://<your-base-url>/store/zb/return`
