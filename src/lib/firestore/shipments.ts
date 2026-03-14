"use server";

import { requireStaffPermission } from "../auth";
import { getDb, isFirebaseConfigured } from "../firebase-admin";
import { createAuditLog } from "./audit";
import type { DeliveryMethod, FulfillmentStatus, Order } from "./orders";

export type ShipmentStatus =
  | "awaiting_payment"
  | "pickup_pending"
  | "ready_for_dispatch"
  | "out_for_delivery"
  | "delivered"
  | "collected"
  | "issue";

export type ShipmentRecord = {
  id: string;
  orderReference: string;
  deliveryMethod: DeliveryMethod;
  status: ShipmentStatus;
  zoneId?: string;
  zoneName?: string;
  courierName?: string;
  courierPhone?: string;
  assignmentNotes?: string;
  proofOfDeliveryUrl?: string;
  createdAt: string;
  updatedAt: string;
};

function buildShipmentId(orderReference: string) {
  return `shipment_${orderReference}`;
}

async function requireAdminSession() {
  return requireStaffPermission("shipments.view");
}

function normaliseShipmentStatus(status?: string): ShipmentStatus {
  switch (status) {
    case "pickup_pending":
    case "ready_for_dispatch":
    case "out_for_delivery":
    case "delivered":
    case "collected":
    case "issue":
      return status;
    default:
      return "awaiting_payment";
  }
}

function sanitizeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeValue(item))
      .filter(item => item !== undefined);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, entry]) => [key, sanitizeValue(entry)])
        .filter(([, entry]) => entry !== undefined),
    );
  }
  return value;
}

function stripUndefined<T extends Record<string, unknown>>(data: T): T {
  return sanitizeValue(data) as T;
}

export async function getShipmentByOrderReference(orderReference: string): Promise<ShipmentRecord | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const doc = await getDb().collection("shipments").doc(buildShipmentId(orderReference)).get();
  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() } as ShipmentRecord;
}

export async function listShipments(): Promise<ShipmentRecord[]> {
  await requireAdminSession();

  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDb().collection("shipments").orderBy("updatedAt", "desc").limit(200).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ShipmentRecord);
}

export async function ensureShipmentForOrder(input: {
  orderReference: string;
  deliveryMethod: DeliveryMethod;
  status: FulfillmentStatus;
  zoneId?: string;
  zoneName?: string;
}) {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const timestamp = new Date().toISOString();
  const id = buildShipmentId(input.orderReference);
  const shipment: Omit<ShipmentRecord, "id"> = {
    orderReference: input.orderReference,
    deliveryMethod: input.deliveryMethod,
    status: normaliseShipmentStatus(input.status),
    zoneId: input.zoneId,
    zoneName: input.zoneName,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await getDb().collection("shipments").doc(id).set(stripUndefined(shipment), { merge: true });
  return getShipmentByOrderReference(input.orderReference);
}

export async function syncShipmentStatusForOrder(order: Order) {
  if (!isFirebaseConfigured()) {
    return null;
  }

  return ensureShipmentForOrder({
    orderReference: order.id,
    deliveryMethod: order.shipping?.deliveryMethod ?? "collect",
    status: order.shipping?.status ?? "awaiting_payment",
    zoneId: order.shipping?.zoneId,
    zoneName: order.shipping?.zoneName,
  });
}

export async function updateShipmentForOrder(input: {
  orderReference: string;
  status?: FulfillmentStatus;
  courierName?: string;
  courierPhone?: string;
  assignmentNotes?: string;
  proofOfDeliveryUrl?: string;
}) {
  await requireStaffPermission("shipments.manage");

  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const db = getDb();
  const orderDoc = await db.collection("orders").doc(input.orderReference).get();
  if (!orderDoc.exists) {
    throw new Error("Order not found");
  }

  const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
  const existing = await getShipmentByOrderReference(input.orderReference);
  const timestamp = new Date().toISOString();

  const nextStatus = normaliseShipmentStatus(input.status ?? existing?.status ?? order.shipping?.status);
  const id = buildShipmentId(input.orderReference);

  await db.collection("shipments").doc(id).set(
    stripUndefined({
      orderReference: input.orderReference,
      deliveryMethod: order.shipping?.deliveryMethod ?? "collect",
      zoneId: order.shipping?.zoneId,
      zoneName: order.shipping?.zoneName,
      status: nextStatus,
      courierName: input.courierName?.trim() || undefined,
      courierPhone: input.courierPhone?.trim() || undefined,
      assignmentNotes: input.assignmentNotes?.trim() || undefined,
      proofOfDeliveryUrl: input.proofOfDeliveryUrl?.trim() || undefined,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }),
    { merge: true },
  );

  await db.collection("orders").doc(input.orderReference).set(
    {
      shipping: {
        ...(order.shipping ?? {
          deliveryMethod: "collect",
        }),
        status: nextStatus,
        updatedAt: timestamp,
      },
      updatedAt: timestamp,
    },
    { merge: true },
  );

  await createAuditLog({
    action: "shipment_updated",
    targetType: "shipment",
    targetId: id,
    detail: `Shipment updated for order ${input.orderReference}.`,
    meta: {
      orderReference: input.orderReference,
      status: nextStatus,
      courierName: input.courierName?.trim() || undefined,
      courierPhone: input.courierPhone?.trim() || undefined,
      proofOfDeliveryUrl: input.proofOfDeliveryUrl?.trim() || undefined,
    },
  });

  return getShipmentByOrderReference(input.orderReference);
}
