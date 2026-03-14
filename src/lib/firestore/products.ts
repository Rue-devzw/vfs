"use server"

import { getDb, isFirebaseConfigured } from "../firebase-admin";
import { requireStaffPermission } from "../auth";
import { getInventoryRecordBySku, getInventoryStatus, listInventoryRecords, type InventoryStatus } from "./inventory";

export type StoreProduct = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  unit: string;
  category: string;
  subcategory?: string;
  image: string;
  onSpecial: boolean;
  sku?: string;
  availableForSale: boolean;
  inventoryManaged: boolean;
  stockOnHand: number;
  reservedQuantity: number;
  allowBackorder: boolean;
  inventoryStatus: InventoryStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductWriteInput = Omit<StoreProduct, "id" | "inventoryStatus"> & {
  inventoryStatus?: InventoryStatus;
};

export type ProductFilters = {
  category?: string;
  subcategory?: string;
  onSpecial?: boolean;
  limit?: number;
  cursor?: string;
};

export type ListProductsResult = {
  items: StoreProduct[];
  nextCursor?: string;
  source: "firestore";
};

export type CategorySummary = {
  name: string;
  productCount: number;
  onSpecialCount: number;
  subcategories: string[];
};

export type ListCategoriesResult = {
  categories: CategorySummary[];
  source: "firestore";
};

type FirestoreProductRecord = {
  name: string;
  price: number;
  oldPrice?: number;
  unit: string;
  category: string;
  subcategory?: string;
  image: string;
  onSpecial?: boolean;
  sku?: string;
  createdAt?: string;
  updatedAt?: string;
};

function normaliseFirestoreProduct(
  id: string,
  data: FirestoreProductRecord,
  inventory?: {
    onlinePrice?: number | null;
    availableForSale: boolean;
    inventoryManaged: boolean;
    stockOnHand: number;
    reservedQuantity: number;
    allowBackorder: boolean;
    inventoryStatus: InventoryStatus;
  },
): StoreProduct {
  const fallbackAvailableForSale = data.price > 0;
  return {
    id,
    name: data.name,
    price: typeof inventory?.onlinePrice === "number" ? inventory.onlinePrice : data.price,
    oldPrice: typeof data.oldPrice === "number" ? data.oldPrice : undefined,
    unit: data.unit,
    category: data.category,
    subcategory: data.subcategory,
    image: data.image,
    onSpecial: Boolean(data.onSpecial),
    sku: data.sku,
    availableForSale: inventory?.availableForSale ?? fallbackAvailableForSale,
    inventoryManaged: inventory?.inventoryManaged ?? false,
    stockOnHand: inventory?.stockOnHand ?? 0,
    reservedQuantity: inventory?.reservedQuantity ?? 0,
    allowBackorder: inventory?.allowBackorder ?? false,
    inventoryStatus: inventory?.inventoryStatus ?? (fallbackAvailableForSale ? "in_stock" : "out_of_stock"),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function ensureFirestoreConfigured() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Firestore is required for product data.");
  }
}

export async function listProducts(filters: ProductFilters = {}): Promise<ListProductsResult> {
  ensureFirestoreConfigured();

  const db = getDb();
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection("products");

  if (filters.category) {
    query = query.where("category", "==", filters.category);
  }

  if (filters.subcategory) {
    query = query.where("subcategory", "==", filters.subcategory);
  }

  if (typeof filters.onSpecial === "boolean") {
    query = query.where("onSpecial", "==", filters.onSpecial);
  }

  query = query.orderBy("name");

  if (filters.cursor) {
    const cursorDoc = await db.collection("products").doc(filters.cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const limit = typeof filters.limit === "number" ? Math.max(1, Math.floor(filters.limit)) : undefined;
  if (limit) {
    query = query.limit(limit);
  }

  const snapshot = await query.get();
  const inventoryMap = await listInventoryRecords();
  const items = snapshot.docs.map(doc => {
    const data = doc.data() as FirestoreProductRecord;
    const inventoryRecord = data.sku ? inventoryMap.get(data.sku.toUpperCase()) : undefined;
    return normaliseFirestoreProduct(doc.id, data, inventoryRecord ? {
      ...inventoryRecord,
      inventoryStatus: getInventoryStatus(inventoryRecord),
    } : undefined);
  });
  const hasMore = Boolean(limit && snapshot.size === limit);
  const nextCursor = hasMore && snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : undefined;

  return { items, nextCursor, source: "firestore" };
}

export async function getProductById(id: string): Promise<{ product: StoreProduct | null; source: "firestore" }> {
  ensureFirestoreConfigured();

  const db = getDb();
  const doc = await db.collection("products").doc(id).get();

  if (!doc.exists) {
    return { product: null, source: "firestore" };
  }

  const data = doc.data() as FirestoreProductRecord;
  const inventoryRecord = await getInventoryRecordBySku(data.sku);

  return {
    product: normaliseFirestoreProduct(doc.id, data, inventoryRecord ? {
      ...inventoryRecord,
      inventoryStatus: getInventoryStatus(inventoryRecord),
    } : undefined),
    source: "firestore",
  };
}

export async function listCategories(): Promise<ListCategoriesResult> {
  ensureFirestoreConfigured();

  const db = getDb();
  const snapshot = await db
    .collection("products")
    .select("category", "subcategory", "onSpecial")
    .get();

  const summaries = new Map<string, CategorySummary>();

  snapshot.forEach(doc => {
    const data = doc.data() as Pick<FirestoreProductRecord, "category" | "subcategory" | "onSpecial">;
    if (!data.category) return;

    const summary = summaries.get(data.category) ?? {
      name: data.category,
      productCount: 0,
      onSpecialCount: 0,
      subcategories: [],
    };

    summary.productCount += 1;
    if (data.onSpecial) summary.onSpecialCount += 1;
    if (data.subcategory && !summary.subcategories.includes(data.subcategory)) {
      summary.subcategories.push(data.subcategory);
    }

    summaries.set(data.category, summary);
  });

  const categories = Array.from(summaries.values()).sort((a, b) => a.name.localeCompare(b.name));
  return { categories, source: "firestore" };
}

export async function createProduct(product: ProductWriteInput): Promise<string> {
  await requireStaffPermission("products.edit");

  const db = getDb();
  const timestamp = new Date().toISOString();
  const productPayload = { ...product };
  delete productPayload.inventoryStatus;
  const { availableForSale, inventoryManaged, stockOnHand, reservedQuantity, allowBackorder } = product;
  const docRef = await db.collection("products").add({
    ...productPayload,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  if (product.sku) {
    await db.collection("inventory_items").doc(product.sku.toUpperCase()).set({
      sku: product.sku.toUpperCase(),
      productId: docRef.id,
      onlinePrice: product.price,
      availableForSale,
      inventoryManaged,
      stockOnHand,
      reservedQuantity,
      allowBackorder,
      updatedAt: timestamp,
    }, { merge: true });
  }
  return docRef.id;
}

export async function updateProduct(id: string, product: Partial<ProductWriteInput>): Promise<void> {
  await requireStaffPermission("products.edit");

  const db = getDb();
  const timestamp = new Date().toISOString();
  const productPayload = { ...product };
  delete productPayload.inventoryStatus;
  const { availableForSale, inventoryManaged, stockOnHand, reservedQuantity, allowBackorder } = product;
  await db.collection("products").doc(id).update({
    ...productPayload,
    updatedAt: timestamp,
  });

  const sku = typeof product.sku === "string" && product.sku.trim()
    ? product.sku.toUpperCase()
    : undefined;

  if (sku) {
    await db.collection("inventory_items").doc(sku).set({
      sku,
      productId: id,
      onlinePrice: product.price,
      availableForSale,
      inventoryManaged,
      stockOnHand,
      reservedQuantity,
      allowBackorder,
      updatedAt: timestamp,
    }, { merge: true });
  }
}

export async function deleteProduct(id: string): Promise<void> {
  await requireStaffPermission("products.edit");

  const db = getDb();
  await db.collection("products").doc(id).delete();
}
