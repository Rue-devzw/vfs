# E-Valley Store

The Flutter client in this repository focuses exclusively on the Valley Farm
Secrets storefront. It mirrors the shopping experience that lives under the
`/store` route of the Next.js web application by reusing the shared Store API
endpoints for products, categories, and checkout hand-off.

## Features

- Product catalogue with hero highlights, category browsing, and search
  filtering.
- Specials carousel and cart management with a streamlined checkout prompt.
- Shared networking stack (`StoreApiClient`, `StoreRepository`) that targets the
  same API used by the web experience.

## Prerequisites

- [Flutter](https://docs.flutter.dev/get-started/install) 3.22 or newer.
- An instance of the Next.js application from this monorepo running locally or
  deployed so the Store API endpoints are available.

## Running the app

```bash
cd e_valley_store
flutter pub get
flutter run
```

The default configuration points to `http://localhost:9002`, matching the
development server for `npm run dev` in the web project. When you build a
release the app automatically switches to the production domain configured in
`StoreApiConfig` (`https://valleyfarmsecrets.com`).

To point the client at a different environment, pass
`--dart-define=STORE_API_BASE_URL=https://your-domain` when running or building
the Flutter app.

## Testing

Run the Flutter test suite from the project root:

```bash
flutter test
```

## Additional resources

- [Store API documentation](../docs/store-api.md)
- [Web storefront implementation](../src/app/store)
