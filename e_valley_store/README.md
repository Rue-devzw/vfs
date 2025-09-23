# E-Valley Store

The Flutter client now serves as a lightweight shell around the Valley Farm
Secrets web storefront. Instead of rebuilding the shopping experience with
native widgets it embeds the `/store` route from the Next.js application in a
full-screen WebView. This keeps the mobile app automatically in sync with the
web experience while still letting us distribute it through the app stores.

## Features

- WebView wrapper that loads the Valley Farm Secrets `/store` experience.
- Material 3 styling with a native app bar and reload control.
- Android back-button handling that navigates through the web history before
  exiting the app.

## Configuration

By default the WebView targets the production storefront at
`https://valleyfarmsecrets.com/store`. You can point the shell at a different
host (such as a locally running instance of the Next.js project) with a
`--dart-define`:

```bash
flutter run --dart-define=STORE_WEB_URL=http://localhost:9002/store
```

## Running the app

```bash
cd e_valley_store
flutter pub get
flutter run
```

## Testing

Run the Flutter test suite from the project root:

```bash
flutter test
```

## Additional resources

- [Web storefront implementation](../src/app/store)
