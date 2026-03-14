"use server";

import { getDb, isFirebaseConfigured } from "../firebase-admin";
import { type CurrencyCode } from "../currency";
import { getProductById } from "./products";

export type CartSnapshotItem = {
  productId: string;
  quantity: number;
};

export type CartDocument = {
  id: string;
  sessionId: string;
  currencyCode: CurrencyCode;
  items: CartSnapshotItem[];
  createdAt: string;
  updatedAt: string;
};

export type HydratedCart = {
  id: string;
  sessionId: string;
  currencyCode: CurrencyCode;
  items: Array<Awaited<ReturnType<typeof getProductById>>["product"] & { quantity: number }>;
  updatedAt: string;
};

function normaliseSessionId(sessionId: string) {
  return sessionId.trim();
}

function sanitiseItems(items: CartSnapshotItem[]) {
  return items
    .filter(item => item.productId && Number.isFinite(item.quantity))
    .map(item => ({
      productId: item.productId,
      quantity: Math.max(1, Math.min(99, Math.floor(item.quantity))),
    }));
}

export async function getCart(sessionId: string): Promise<HydratedCart> {
  if (!isFirebaseConfigured()) {
    return { id: sessionId, sessionId, currencyCode: "840", items: [], updatedAt: new Date().toISOString() };
  }

  const db = getDb();
  const docId = normaliseSessionId(sessionId);
  const doc = await db.collection("carts").doc(docId).get();

  if (!doc.exists) {
    const timestamp = new Date().toISOString();
    return { id: docId, sessionId: docId, currencyCode: "840", items: [], updatedAt: timestamp };
  }

  const data = doc.data() as CartDocument;
  const items = await Promise.all(
    (data.items ?? []).map(async item => {
      const { product } = await getProductById(item.productId);
      if (!product || !product.availableForSale) {
        return null;
      }
      return { ...product, quantity: item.quantity };
    }),
  );

  return {
    id: doc.id,
    sessionId: data.sessionId,
    currencyCode: data.currencyCode ?? "840",
    items: items.filter((item): item is NonNullable<typeof item> => Boolean(item)),
    updatedAt: data.updatedAt,
  };
}

export async function saveCart(input: {
  sessionId: string;
  currencyCode: CurrencyCode;
  items: CartSnapshotItem[];
}) {
  if (!isFirebaseConfigured()) {
    return getCart(input.sessionId);
  }

  const db = getDb();
  const docId = normaliseSessionId(input.sessionId);
  const timestamp = new Date().toISOString();
  const items = sanitiseItems(input.items);

  await db.collection("carts").doc(docId).set({
    sessionId: docId,
    currencyCode: input.currencyCode,
    items,
    createdAt: timestamp,
    updatedAt: timestamp,
  }, { merge: true });

  return getCart(docId);
}

export async function clearCart(sessionId: string) {
  if (!isFirebaseConfigured()) {
    return;
  }

  const db = getDb();
  await db.collection("carts").doc(normaliseSessionId(sessionId)).set({
    items: [],
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
