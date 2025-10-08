import { products as staticProducts } from "@/app/store/data";
import type { Product } from "@/app/store/data";
import { getDb, isFirebaseConfigured } from "../firebase-admin";

export type StoreProduct = {
  id: string;
  name: string;
  price: number;
  cashPrice?: number;
  oldPrice?: number;
  unit: string;
  category: string;
  subcategory?: string;
  image: string;
  onSpecial: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  source: "firestore" | "static";
};

export type CategorySummary = {
  name: string;
  productCount: number;
  onSpecialCount: number;
  subcategories: string[];
};

export type ListCategoriesResult = {
  categories: CategorySummary[];
  source: "firestore" | "static";
};

type FirestoreProductRecord = {
  name: string;
  price: number;
  cashPrice?: number;
  oldPrice?: number;
  unit: string;
  category: string;
  subcategory?: string;
  image: string;
  onSpecial?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function normaliseFirestoreProduct(
  id: string,
  data: FirestoreProductRecord,
): StoreProduct {
  return {
    id,
    name: data.name,
    price: data.price,
    cashPrice: typeof data.cashPrice === "number" ? data.cashPrice : undefined,
    oldPrice: typeof data.oldPrice === "number" ? data.oldPrice : undefined,
    unit: data.unit,
    category: data.category,
    subcategory: data.subcategory,
    image: data.image,
    onSpecial: Boolean(data.onSpecial),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function fromStaticProduct(product: Product): StoreProduct {
  return {
    id: String(product.id),
    name: product.name,
    price: product.price,
    cashPrice: typeof product.cashPrice === "number" ? product.cashPrice : undefined,
    oldPrice: product.oldPrice,
    unit: product.unit,
    category: product.category,
    subcategory: product.subcategory,
    image: product.image,
    onSpecial: product.onSpecial,
  };
}

function applyLocalFilters(
  allProducts: Product[],
  filters: ProductFilters,
): { items: StoreProduct[]; nextCursor?: string } {
  let filtered = [...allProducts];

  if (filters.category) {
    filtered = filtered.filter(
      product => product.category.toLowerCase() === filters.category!.toLowerCase(),
    );
  }

  if (filters.subcategory) {
    filtered = filtered.filter(product =>
      product.subcategory?.toLowerCase() === filters.subcategory!.toLowerCase(),
    );
  }

  if (typeof filters.onSpecial === "boolean") {
    filtered = filtered.filter(product => product.onSpecial === filters.onSpecial);
  }

  filtered.sort((a, b) => a.name.localeCompare(b.name));

  if (filters.cursor) {
    const cursorIndex = filtered.findIndex(product => String(product.id) === filters.cursor);
    if (cursorIndex >= 0) {
      filtered = filtered.slice(cursorIndex + 1);
    }
  }

  if (typeof filters.limit === "number") {
    const safeLimit = Math.max(1, Math.floor(filters.limit));
    const limited = filtered.slice(0, safeLimit);
    const hasMore = filtered.length > safeLimit;

    return {
      items: limited.map(fromStaticProduct),
      nextCursor: hasMore && limited.length > 0 ? String(limited[limited.length - 1].id) : undefined,
    };
  }

  return {
    items: filtered.map(fromStaticProduct),
  };
}

export async function listProducts(filters: ProductFilters = {}): Promise<ListProductsResult> {
  if (!isFirebaseConfigured()) {
    const { items, nextCursor } = applyLocalFilters(staticProducts, filters);
    return { items, nextCursor, source: "static" };
  }

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
  const items = snapshot.docs.map(doc => normaliseFirestoreProduct(doc.id, doc.data() as FirestoreProductRecord));
  const hasMore = Boolean(limit && snapshot.size === limit);
  const nextCursor = hasMore && snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : undefined;

  return { items, nextCursor, source: "firestore" };
}

export async function getProductById(id: string): Promise<{ product: StoreProduct | null; source: "firestore" | "static" }> {
  if (!isFirebaseConfigured()) {
    const match = staticProducts.find(product => String(product.id) === id);
    return {
      product: match ? fromStaticProduct(match) : null,
      source: "static",
    };
  }

  const db = getDb();
  const doc = await db.collection("products").doc(id).get();

  if (!doc.exists) {
    return { product: null, source: "firestore" };
  }

  return {
    product: normaliseFirestoreProduct(doc.id, doc.data() as FirestoreProductRecord),
    source: "firestore",
  };
}

export async function listCategories(): Promise<ListCategoriesResult> {
  if (!isFirebaseConfigured()) {
    const summaries = new Map<string, CategorySummary>();

    for (const product of staticProducts) {
      const summary = summaries.get(product.category) ?? {
        name: product.category,
        productCount: 0,
        onSpecialCount: 0,
        subcategories: [],
      };

      summary.productCount += 1;
      if (product.onSpecial) summary.onSpecialCount += 1;
      if (product.subcategory && !summary.subcategories.includes(product.subcategory)) {
        summary.subcategories.push(product.subcategory);
      }

      summaries.set(product.category, summary);
    }

    const categories = Array.from(summaries.values()).sort((a, b) => a.name.localeCompare(b.name));
    return { categories, source: "static" };
  }

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
