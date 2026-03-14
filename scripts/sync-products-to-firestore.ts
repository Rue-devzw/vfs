import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

type StaticProduct = {
  id: number | string;
  name: string;
  sku?: string;
  price: number;
  unit: string;
  category: string;
  subcategory?: string;
  image?: string;
  onSpecial?: boolean;
  oldPrice?: number;
};

type FirestoreProduct = {
  name?: string;
  sku?: string | null;
  price?: number;
  oldPrice?: number;
  unit?: string;
  category?: string;
  subcategory?: string | null;
  image?: string | null;
  onSpecial?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type FirestoreDoc = {
  id: string;
  data: FirestoreProduct;
};

type SyncAction = {
  targetId: string;
  action: "created" | "updated";
  migratedFrom?: string;
  name: string;
};

type DuplicateResolution = {
  name: string;
  keptId: string;
  deletedIds: string[];
};

const envPath = process.env.DOTENV_CONFIG_PATH
  ? path.resolve(process.cwd(), process.env.DOTENV_CONFIG_PATH)
  : path.resolve(process.cwd(), ".env.local");

if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}

const BATCH_SIZE = 400;
const dryRun = process.argv.includes("--dry-run");

function normalize(value: string | undefined | null) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeSku(value: string | undefined | null) {
  return (value ?? "").trim().toUpperCase();
}

function isRichImage(value: string | undefined | null) {
  if (!value) return false;
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/images/");
}

function chooseImage(staticImage: string | undefined, docs: FirestoreDoc[]) {
  if (isRichImage(staticImage)) return staticImage!;

  const richDocImage = docs
    .map(doc => doc.data.image)
    .find(image => isRichImage(image));

  if (richDocImage) return richDocImage;
  return staticImage ?? "/images/placeholder.webp";
}

function buildTargetPayload(product: StaticProduct, image: string, existing: FirestoreDoc | undefined) {
  const timestamp = new Date().toISOString();
  const payload: Record<string, unknown> = {
    name: product.name,
    sku: product.sku ?? null,
    price: product.price,
    unit: product.unit,
    category: product.category,
    subcategory: product.subcategory ?? null,
    image,
    onSpecial: product.onSpecial ?? false,
    createdAt: existing?.data.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (typeof product.oldPrice === "number") {
    payload.oldPrice = product.oldPrice;
  }

  return payload;
}

function buildIndex<T>(items: T[], keyFn: (item: T) => string | undefined) {
  const index = new Map<string, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const list = index.get(key) ?? [];
    list.push(item);
    index.set(key, list);
  }

  return index;
}

function rankDoc(doc: FirestoreDoc) {
  let score = 0;
  if (doc.id.startsWith("product-")) score += 100;
  else if (/^\d+$/.test(doc.id)) score += 50;
  if (normalizeSku(doc.data.sku)) score += 20;
  if (isRichImage(doc.data.image)) score += 10;
  if (typeof doc.data.price === "number") score += 5;
  if (doc.data.updatedAt) score += 1;
  return score;
}

function chooseBestDoc(docs: FirestoreDoc[]) {
  return [...docs].sort((left, right) => rankDoc(right) - rankDoc(left))[0];
}

async function main() {
  const [{ getDb, isFirebaseConfigured }] = await Promise.all([
    import("../src/lib/firebase-admin"),
  ]);

  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Set .env.local before syncing products.");
  }

  const db = getDb();
  const productsPath = path.resolve(process.cwd(), "public/data/products.json");
  if (!fs.existsSync(productsPath)) {
    throw new Error(`products.json not found at ${productsPath}`);
  }

  const staticProducts = JSON.parse(fs.readFileSync(productsPath, "utf8")) as StaticProduct[];
  const snapshot = await db.collection("products").get();
  const firestoreDocs: FirestoreDoc[] = snapshot.docs.map(doc => ({
    id: doc.id,
    data: doc.data() as FirestoreProduct,
  }));

  const byId = new Map(firestoreDocs.map(doc => [doc.id, doc]));
  const bySku = buildIndex(firestoreDocs, doc => normalizeSku(doc.data.sku));
  const byName = buildIndex(firestoreDocs, doc => normalize(doc.data.name));

  const syncActions: SyncAction[] = [];
  const duplicateResolutions: DuplicateResolution[] = [];
  const orphanManualDocs: string[] = [];
  const deletions = new Set<string>();
  const touched = new Set<string>();

  let batch = db.batch();
  let batchCount = 0;

  async function commitBatch() {
    if (dryRun || batchCount === 0) return;
    await batch.commit();
    batch = db.batch();
    batchCount = 0;
  }

  function queueSet(docId: string, payload: Record<string, unknown>) {
    batch.set(db.collection("products").doc(docId), payload, { merge: true });
    batchCount += 1;
  }

  function queueDelete(docId: string) {
    batch.delete(db.collection("products").doc(docId));
    batchCount += 1;
  }

  for (const product of staticProducts) {
    const staticId = String(product.id);
    const targetId = `product-${staticId}`;

    const candidateMap = new Map<string, FirestoreDoc>();
    const targetDoc = byId.get(targetId);
    const numericLegacyDoc = byId.get(staticId);
    const skuCandidates = normalizeSku(product.sku) ? bySku.get(normalizeSku(product.sku)) ?? [] : [];
    const nameCandidates = byName.get(normalize(product.name)) ?? [];

    for (const candidate of [targetDoc, numericLegacyDoc, ...skuCandidates, ...nameCandidates]) {
      if (!candidate) continue;
      candidateMap.set(candidate.id, candidate);
    }

    const candidates = [...candidateMap.values()];
    const existingTarget = candidates.find(doc => doc.id === targetId);
    const primary = existingTarget ?? chooseBestDoc(candidates);
    const image = chooseImage(product.image, candidates);
    const payload = buildTargetPayload(product, image, primary);

    queueSet(targetId, payload);
    touched.add(targetId);

    syncActions.push({
      targetId,
      action: byId.has(targetId) ? "updated" : "created",
      migratedFrom: primary && primary.id !== targetId ? primary.id : undefined,
      name: product.name,
    });

    if (primary && primary.id !== targetId) {
      deletions.add(primary.id);
    }

    for (const candidate of candidates) {
      if (candidate.id !== targetId) {
        deletions.add(candidate.id);
      }
    }

    if (batchCount >= BATCH_SIZE) {
      await commitBatch();
    }
  }

  const manualGroups = new Map<string, FirestoreDoc[]>();
  for (const doc of firestoreDocs) {
    if (doc.id.startsWith("product-")) continue;
    const key = normalize(doc.data.name || doc.id);
    const list = manualGroups.get(key) ?? [];
    list.push(doc);
    manualGroups.set(key, list);
  }

  for (const [name, docs] of manualGroups.entries()) {
    const remaining = docs.filter(doc => !deletions.has(doc.id));
    if (remaining.length <= 1) {
      if (remaining.length === 1 && !touched.has(remaining[0].id)) {
        orphanManualDocs.push(remaining[0].id);
      }
      continue;
    }

    const keep = chooseBestDoc(remaining);
    const toDelete = remaining.filter(doc => doc.id !== keep.id).map(doc => doc.id);

    if (toDelete.length > 0) {
      duplicateResolutions.push({
        name,
        keptId: keep.id,
        deletedIds: toDelete,
      });
      toDelete.forEach(id => deletions.add(id));
    }

    if (!touched.has(keep.id)) {
      orphanManualDocs.push(keep.id);
    }
  }

  for (const docId of deletions) {
    queueDelete(docId);
    if (batchCount >= BATCH_SIZE) {
      await commitBatch();
    }
  }

  await commitBatch();

  const reportDir = path.resolve(process.cwd(), "downloads/firestore-product-sync");
  fs.mkdirSync(reportDir, { recursive: true });

  const report = {
    dryRun,
    staticProductCount: staticProducts.length,
    firestoreProductCountBefore: firestoreDocs.length,
    touchedCanonicalDocs: syncActions.length,
    createdCanonicalDocs: syncActions.filter(action => action.action === "created").length,
    updatedCanonicalDocs: syncActions.filter(action => action.action === "updated").length,
    deletedDuplicateDocs: deletions.size,
    duplicateResolutions,
    orphanManualDocs,
    syncActions,
    generatedAt: new Date().toISOString(),
  };

  const reportPath = path.join(reportDir, `report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ reportPath, ...report }, null, 2));
}

main().catch(error => {
  console.error("Failed to sync products to Firestore:", error);
  process.exitCode = 1;
});
