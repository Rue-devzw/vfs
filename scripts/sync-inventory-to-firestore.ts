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

type InventoryFileCategory = {
  id: string;
  name: string;
  items: Array<{
    code: string;
    description: string;
    cashPrice: number | null;
    onlinePrice: number | null;
  }>;
};

async function main() {
  const [{ getDb, isFirebaseConfigured }] = await Promise.all([import("../src/lib/firebase-admin")]);

  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const inventoryPath = path.resolve(process.cwd(), "public/data/inventory.json");
  const categories = JSON.parse(fs.readFileSync(inventoryPath, "utf8")) as InventoryFileCategory[];
  const db = getDb();
  const timestamp = new Date().toISOString();
  let batch = db.batch();
  let batchCount = 0;
  let synced = 0;

  for (const category of categories) {
    for (const item of category.items) {
      const sku = item.code.trim().toUpperCase();
      const onlinePrice = typeof item.onlinePrice === "number" ? item.onlinePrice : null;
      batch.set(db.collection("inventory_items").doc(sku), {
        sku,
        description: item.description,
        categoryId: category.id,
        categoryName: category.name,
        cashPrice: item.cashPrice,
        onlinePrice,
        inventoryManaged: false,
        availableForSale: onlinePrice !== null,
        stockOnHand: 0,
        reservedQuantity: 0,
        allowBackorder: false,
        updatedAt: timestamp,
      }, { merge: true });
      batchCount += 1;
      synced += 1;

      if (batchCount === 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(JSON.stringify({ synced, timestamp }, null, 2));
}

main().catch(error => {
  console.error("Failed to sync inventory:", error);
  process.exitCode = 1;
});
