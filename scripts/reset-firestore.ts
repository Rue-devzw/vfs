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

const ALL_COLLECTIONS = [
  "admin_login_attempts",
  "audit_logs",
  "carts",
  "customer_engagements",
  "customers",
  "delivery_quotes",
  "delivery_zones",
  "digital_orders",
  "inventory_items",
  "inventory_movements",
  "inventory_reservations",
  "notifications",
  "orders",
  "payment_events",
  "payment_intents",
  "products",
  "rate_limits",
  "reconciliation_batches",
  "reconciliation_exception_assignments",
  "refund_cases",
  "refund_executions",
  "settings",
  "shipments",
  "webhook_inbox",
] as const;

const CATALOG_AND_CONFIG_COLLECTIONS = [
  "delivery_zones",
  "inventory_items",
  "products",
  "settings",
] as const;

const FRESH_START_COLLECTIONS = ALL_COLLECTIONS.filter(
  collection => !CATALOG_AND_CONFIG_COLLECTIONS.includes(collection as (typeof CATALOG_AND_CONFIG_COLLECTIONS)[number]),
);

type ResetScope = "fresh-start" | "full";

function getArg(flag: string) {
  const matched = process.argv.find(entry => entry.startsWith(`${flag}=`));
  return matched ? matched.slice(flag.length + 1) : undefined;
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function resolveScope(raw?: string): ResetScope {
  if (raw === "full") return "full";
  return "fresh-start";
}

async function deleteCollection(collectionName: string, batchSize = 200) {
  const { getDb } = await import("../src/lib/firebase-admin");
  const db = getDb();
  let deleted = 0;

  while (true) {
    const snapshot = await db.collection(collectionName).limit(batchSize).get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deleted += snapshot.size;
  }

  return deleted;
}

async function main() {
  const { isFirebaseConfigured } = await import("../src/lib/firebase-admin");
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Check .env.local before running the reset.");
  }

  const scope = resolveScope(getArg("--scope"));
  const confirm = getArg("--confirm");
  const dryRun = hasFlag("--dry-run");
  const reseedProducts = hasFlag("--reseed-products");
  const collections = scope === "full" ? ALL_COLLECTIONS : FRESH_START_COLLECTIONS;

  console.log(`\nFirestore reset scope: ${scope}`);
  console.log(`Collections targeted (${collections.length}):`);
  for (const collection of collections) {
    console.log(`- ${collection}`);
  }

  if (dryRun) {
    console.log("\nDry run only. No records were deleted.");
    return;
  }

  if (confirm !== "RESET") {
    console.log('\nRefusing to run without explicit confirmation. Re-run with --confirm=RESET');
    process.exitCode = 1;
    return;
  }

  const results: Array<{ collection: string; deleted: number }> = [];
  for (const collection of collections) {
    const deleted = await deleteCollection(collection);
    results.push({ collection, deleted });
    console.log(`Deleted ${deleted} document(s) from ${collection}`);
  }

  console.log("\nReset complete.");
  const totalDeleted = results.reduce((sum, item) => sum + item.deleted, 0);
  console.log(`Total deleted documents: ${totalDeleted}`);

  if (reseedProducts) {
    if (scope === "full") {
      console.log("\nProducts were wiped and should be reseeded with:");
      console.log("npm run db:seed");
    } else {
      console.log("\nProduct/catalog collections were preserved; reseed not required.");
    }
  }
}

main().catch(error => {
  console.error("Firestore reset failed:", error);
  process.exitCode = 1;
});
