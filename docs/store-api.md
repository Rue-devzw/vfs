# Valley Farm Secrets Store API

The store API exposes structured data for Flutter and other client applications. It is built on top of Next.js route handlers and can source data from Firestore (preferred) or the local static catalogue if Firestore credentials are missing. All responses include a `source` field so you can confirm whether the data came from Firestore (`"firestore"`) or the in-repo fallback (`"static"`).

## Base URL

When running locally the API is served from `http://localhost:9002` (because `npm run dev` uses port 9002). Once deployed to Vercel the base URL becomes `https://<your-vercel-domain>`.

All endpoints documented below are relative to the `/api` prefix.

## Data Model

```ts
interface StoreProduct {
  id: string;          // Firestore document id (or stringified static id)
  name: string;
  price: number;
  cashPrice?: number;  // Optional in-store cash price when different from the online price
  oldPrice?: number;
  unit: string;
  category: string;
  subcategory?: string;
  image: string;       // Image identifier used by the web app
  onSpecial: boolean;
  createdAt?: string;  // ISO-8601 timestamp if persisted in Firestore
  updatedAt?: string;  // ISO-8601 timestamp if persisted in Firestore
}
```

Categories are derived from the products collection and include counts:

```ts
interface CategorySummary {
  name: string;
  productCount: number;
  onSpecialCount: number;
  subcategories: string[];
}
```

## Endpoints

### `GET /api/store/products`

List products with optional filtering and cursor-based pagination.

| Query param   | Type    | Description |
| ------------- | ------- | ----------- |
| `category`    | string  | Filter by category name (case-sensitive in Firestore, case-insensitive in fallback mode). |
| `subcategory` | string  | Filter by subcategory. Combine with `category` for the most efficient Firestore queries. |
| `onSpecial`   | boolean | `true` to return only products on special, `false` for non-special items. |
| `limit`       | number  | Maximum number of items to return (1-100). Defaults to all items when omitted. |
| `cursor`      | string  | The `id` of the last item from the previous page. |

**Response**

```json
{
  "data": [StoreProduct, ...],
  "pagination": {
    "limit": 20,
    "nextCursor": "8" // omitted when there are no more results
  },
  "source": "firestore"
}
```

**Notes**

- If you combine multiple filters in Firestore you may be prompted to create a composite index. Suggested indexes:
  - `category` + `name` (ascending)
  - `category` + `subcategory` + `name` (ascending)
  - `onSpecial` + `name` (ascending)
- When Firestore credentials are absent the handler falls back to the static catalogue bundled with the repository.

### `GET /api/store/products/{id}`

Retrieve a single product by document id. Returns HTTP 404 when the product is missing.

```json
{
  "data": StoreProduct,
  "source": "firestore"
}
```

### `GET /api/store/categories`

Returns aggregate information for each category.

```json
{
  "data": [CategorySummary, ...],
  "source": "firestore"
}
```

### Existing form submission endpoints

The following endpoints already existed and continue to use Firestore for persistence:

- `POST /api/orders`
- `POST /api/wholesale`
- `POST /api/partners`
- `POST /api/prebookings`

They expect JSON bodies that match the respective forms rendered in the web application.

## AI helper endpoints

Flutter now shares the same AI contract that powers the web experience. Both endpoints require
`Content-Type: application/json` and, when `AI_API_TOKEN` (or `NEXT_PUBLIC_AI_API_TOKEN`) is set in
the environment, an `Authorization: Bearer <token>` header. Each caller is limited to 10 requests per
minute; exceeding the limit yields HTTP 429 with a `Retry-After` header.

### `POST /api/ai/farming-tip`

Request body:

```json
{
  "topic": "How do I keep pests off my tomatoes?"
}
```

Successful response:

```json
{
  "tip": "Use a row cover to protect tomato plants and rotate crops to disrupt pest life cycles."
}
```

Errors:

| Status | Reason |
| ------ | ------ |
| 400 | Missing/invalid JSON body or the AI flow returned a validation error. |
| 401 | `Authorization` header missing when a token is configured. |
| 403 | Token present but incorrect. |
| 415 | Incorrect `Content-Type`. |
| 429 | Rate limit exceeded. |
| 500 | Unexpected server failure when calling the AI flow. |

### `POST /api/ai/image-caption`

Request body:

```json
{
  "imageUrl": "https://example.com/photos/strawberries.jpg"
}
```

Successful response:

```json
{
  "caption": "Freshly picked strawberries ready for the farmers' market."
}
```

Errors mirror the farming-tip endpoint. In addition, the AI action enforces a 5&nbsp;MB limit and
restricts remote images to JPEG, PNG, GIF, or WebP. When the upstream fetch rejects the content type
or size, the handler responds with HTTP 400 and the descriptive error message from the action.

## Setting up Firestore

1. **Create a Firebase project** (https://console.firebase.google.com) and enable the Firestore database in *Native* mode.
2. **Create a service account key** with the *Firebase Admin SDK* role.
3. **Add the credentials to your environment** (local `.env.local` file and Vercel project settings):

   ```bash
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project-id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

   > The private key must keep the literal `\n` newlines so it can be parsed correctly at runtime.

4. **Seed the initial catalogue** (optional but recommended) so Firestore contains the same products as the web app:

   ```bash
   npx tsx scripts/seed-products.ts
   ```

   You can point to a different env file by setting `DOTENV_CONFIG_PATH=./.env.production.local` before running the script.

5. **Verify Firestore security rules.** For server-side access through the Admin SDK you can keep the default locked-down rules. For any direct client access you will need to tailor the rules separately.

## Local development workflow

1. Populate `.env.local` with the Firebase credentials.
2. Run the seeding script once.
3. Start the development server: `npm run dev`.
4. Test an endpoint, e.g.:

   ```bash
   curl 'http://localhost:9002/api/store/products?category=Fruit%20%26%20Veg&limit=5'
   ```

## Deploying to Vercel

1. Push your code to the Git repository connected to Vercel.
2. In the Vercel dashboard open your project and configure the environment variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`). Make sure to add them to the *Production*, *Preview*, and *Development* environments as required.
3. Trigger a deployment (manually or by pushing to the branch Vercel monitors). Vercel automatically builds the Next.js app and exposes the API routes at `https://<your-project>/api/...`.
4. Test the deployed endpoints, for example:

   ```bash
   curl 'https://<your-project>/api/store/products?onSpecial=true'
   ```

## Using the API from Flutter

1. Add the [`http`](https://pub.dev/packages/http) package to your Flutter project.
2. Create a data source class:

   ```dart
   import 'dart:convert';
   import 'package:http/http.dart' as http;

   class StoreApiClient {
     StoreApiClient(this.baseUrl);

     final String baseUrl;

     Future<List<Map<String, dynamic>>> fetchProducts({
       String? category,
       bool? onSpecial,
       int? limit,
       String? cursor,
     }) async {
       final uri = Uri.parse('$baseUrl/api/store/products').replace(queryParameters: {
         if (category != null) 'category': category,
         if (onSpecial != null) 'onSpecial': onSpecial.toString(),
         if (limit != null) 'limit': limit.toString(),
         if (cursor != null) 'cursor': cursor,
       });

       final response = await http.get(uri);
       if (response.statusCode != 200) {
         throw Exception('Failed to load products: ${response.body}');
       }

       final payload = json.decode(response.body) as Map<String, dynamic>;
       return List<Map<String, dynamic>>.from(payload['data'] as List<dynamic>);
     }
   }
   ```

3. Store the `nextCursor` from the response to implement infinite scrolling.
4. Repeat the same pattern for `GET /api/store/products/{id}` and `GET /api/store/categories` as needed.

By following these steps you can keep a single source of truth for the product catalogue, power the existing Next.js storefront, and enable external clients (like your Flutter app) to consume the same data over a well-defined API.
