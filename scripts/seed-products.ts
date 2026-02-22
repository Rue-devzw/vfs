import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

const envPath = process.env.DOTENV_CONFIG_PATH
  ? path.resolve(process.cwd(), process.env.DOTENV_CONFIG_PATH)
  : path.resolve(process.cwd(), ".env.local");

if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}

import { getDb, isFirebaseConfigured } from "../src/lib/firebase-admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawProduct {
  id: number;
  name: string;
  sku?: string;
  price: number;
  unit: string;
  category: string;
  subcategory?: string;
  image?: string;
  onSpecial?: boolean;
  oldPrice?: number;
}

// ---------------------------------------------------------------------------
// Image resolution
// ---------------------------------------------------------------------------

/**
 * Build a lookup map from normalised name → public path.
 * Files in /public/images/ are named like "Apples Assorted - Heads.webp"
 * The JSON stores slugs like "apples-assorted-heads".
 */
function buildImageMap(imagesDir: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(imagesDir)) return map;
  for (const file of fs.readdirSync(imagesDir)) {
    if (!file.toLowerCase().endsWith(".webp")) continue;
    const baseName = file.replace(/\.webp$/i, "");
    const normalised = baseName.toLowerCase().replace(/[\s\-&()]/g, "");
    map.set(normalised, `/images/${file}`);
  }
  return map;
}

function resolveImagePath(
  slug: string | undefined,
  name: string,
  imageMap: Map<string, string>
): string {
  // Already a path/URL?
  if (slug && (slug.startsWith("/") || slug.startsWith("http"))) return slug;

  // Match via JSON slug
  if (slug) {
    const slugNorm = slug.toLowerCase().replace(/[\s\-&()]/g, "");
    const match = imageMap.get(slugNorm);
    if (match) return match;
  }

  // Match via product display name
  const nameNorm = name.toLowerCase().replace(/[\s\-&()]/g, "");
  const nameMatch = imageMap.get(nameNorm);
  if (nameMatch) return nameMatch;

  return "/images/placeholder.webp";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const BATCH_SIZE = 400;

async function seedProducts() {
  if (!isFirebaseConfigured()) {
    console.error("Firebase credentials are missing. Check your .env.local file.");
    process.exitCode = 1;
    return;
  }

  const jsonPath = path.resolve(process.cwd(), "public/data/products.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("products.json not found at", jsonPath);
    process.exitCode = 1;
    return;
  }

  const rawProducts: RawProduct[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  console.log(`📦  Loaded ${rawProducts.length} products from products.json`);

  const imagesDir = path.resolve(process.cwd(), "public/images");
  const imageMap = buildImageMap(imagesDir);
  console.log(`🖼️   Found ${imageMap.size} WebP images in /public/images`);

  const db = getDb();
  const now = new Date().toISOString();

  let seeded = 0;
  let currentBatch = db.batch();
  let batchCount = 0;

  for (const product of rawProducts) {
    const docId = `product-${product.id}`;
    const ref = db.collection("products").doc(docId);

    const imagePath = resolveImagePath(product.image, product.name, imageMap);

    const payload: Record<string, unknown> = {
      name: product.name,
      price: product.price,
      unit: product.unit,
      category: product.category,
      subcategory: product.subcategory ?? null,
      image: imagePath,
      onSpecial: product.onSpecial ?? false,
      sku: product.sku ?? null,
      updatedAt: now,
      createdAt: now,
    };

    if (product.oldPrice !== undefined) {
      payload.oldPrice = product.oldPrice;
    }

    currentBatch.set(ref, payload, { merge: true });
    batchCount++;
    seeded++;

    if (batchCount === BATCH_SIZE) {
      await currentBatch.commit();
      console.log(`  ✅  Committed batch (${seeded} done so far)`);
      currentBatch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await currentBatch.commit();
  }

  console.log(`\n🎉  Done! ${seeded} products seeded into Firestore "products" collection.`);
}

seedProducts().catch(error => {
  console.error("Failed to seed products:", error);
  process.exitCode = 1;
});
