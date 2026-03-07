import type { Order } from "@/lib/firestore/orders";
import crypto from "crypto";

type InternalOrderStatus = Order["status"];

type PendingOrderInput = {
  reference: string;
  items: Order["items"];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod: string;
  gatewayReference?: string;
  notes?: string;
};

export function mapExternalStatusToInternal(status: string): InternalOrderStatus {
  const normalized = status.toLowerCase();

  switch (normalized) {
    case "paid":
    case "success":
    case "awaiting delivery":
    case "processing":
      return "processing";
    case "delivered":
      return "delivered";
    case "shipped":
      return "shipped";
    case "cancelled":
    case "canceled":
    case "failed":
    case "expired":
      return "cancelled";
    case "pending":
    case "sent":
    default:
      return "pending";
  }
}

function buildEventId(reference: string, status: string, meta?: Record<string, unknown>) {
  const seed = JSON.stringify({
    reference,
    status,
    gatewayRef: meta?.gatewayReference ?? meta?.transactionReference ?? null,
  });
  return crypto.createHash("sha256").update(seed).digest("hex");
}

async function getOrdersDb() {
  const { getDb } = await import("@/lib/firebase-admin");
  return getDb();
}

function stripUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;
}

export async function createPendingOrder(input: PendingOrderInput) {
  const db = await getOrdersDb();
  const timestamp = new Date().toISOString();

  await db.collection("orders").doc(input.reference).set(stripUndefined({
    id: input.reference,
    reference: input.reference,
    items: input.items,
    subtotal: input.subtotal,
    deliveryFee: input.deliveryFee,
    total: input.total,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    customerAddress: input.customerAddress,
    status: "pending",
    paymentMethod: input.paymentMethod,
    gatewayReference: input.gatewayReference,
    notes: input.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export async function savePollUrl(reference: string, pollUrl: string) {
  const db = await getOrdersDb();
  await db.collection("orders").doc(reference).set(
    stripUndefined({
      pollUrl,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true },
  );
}

export async function setOrderStatus(reference: string, status: string, meta?: Record<string, unknown>) {
  const db = await getOrdersDb();
  const eventId = buildEventId(reference, status, meta);
  const eventRef = db.collection("payment_events").doc(eventId);
  const orderRef = db.collection("orders").doc(reference);

  await db.runTransaction(async tx => {
    const eventDoc = await tx.get(eventRef);
    if (eventDoc.exists) {
      return;
    }

    tx.set(eventRef, stripUndefined({
      reference,
      status,
      meta: meta ?? {},
      createdAt: new Date().toISOString(),
    }));

    tx.set(orderRef, stripUndefined({
      status: mapExternalStatusToInternal(status),
      paymentMeta: meta ?? {},
      updatedAt: new Date().toISOString(),
    }), { merge: true });
  });
}
