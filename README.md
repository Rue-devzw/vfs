# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Store API

The storefront data is also available through dedicated API routes designed for the upcoming Flutter client. Refer to [docs/store-api.md](docs/store-api.md) for endpoint descriptions, Firestore setup instructions, and deployment guidance.

## Paynow Integration

This project uses Paynow for payments. To set up Paynow, you will need to add the following environment variables to your `.env.local` file:

```
PAYNOW_INTEGRATION_ID=<your-paynow-integration-id>
PAYNOW_INTEGRATION_KEY=<your-paynow-integration-key>
NEXT_PUBLIC_BASE_URL=<your-base-url>
```

### Testing

To test the Paynow integration, you can use the following test credentials:

- Integration ID: 22307
- Integration Key: 99e17bc8-b012-47b8-938c-3a55e05518a9

### Webhooks

You will need to configure the following webhook URLs in your Paynow account:

- Result URL: `https://<your-base-url>/api/paynow/ipn`
- Return URL: `https://<your-base-url>/store/paynow/return`
