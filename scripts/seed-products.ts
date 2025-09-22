import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

import { getDb, isFirebaseConfigured } from "../src/lib/firebase-admin";
import { products } from "../src/app/store/data";

const envPath = process.env.DOTENV_CONFIG_PATH
  ? path.resolve(process.cwd(), process.env.DOTENV_CONFIG_PATH)
  : path.resolve(process.cwd(), ".env.local");

if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}

async function seedProducts() {
  if (!isFirebaseConfigured()) {
    console.error("Firebase credentials are missing. Check your environment variables.");
    process.exitCode = 1;
    return;
  }

  const db = getDb();
  const batch = db.batch();

  for (const product of products) {
    const ref = db.collection("products").doc(String(product.id));
    const existing = await ref.get();
    const now = new Date().toISOString();

    const payload: Record<string, unknown> = {
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      category: product.category,
      image: product.image,
      onSpecial: product.onSpecial,
      updatedAt: now,
    };

    if (product.oldPrice !== undefined) {
      payload.oldPrice = product.oldPrice;
    }

    if (product.subcategory) {
      payload.subcategory = product.subcategory;
    }

    const existingCreatedAt = existing.exists
      ? (existing.data()?.createdAt as string | undefined) ?? existing.createTime?.toDate().toISOString()
      : null;

    payload.createdAt = existingCreatedAt ?? now;

    batch.set(ref, payload, { merge: true });
  }

  await batch.commit();
  console.log(`Seeded ${products.length} products to Firestore.`);
}

seedProducts().catch(error => {
  console.error("Failed to seed products", error);
  process.exitCode = 1;
});
