"use server";

import { requireStaffPermission, requireStaffRoles } from "../auth";
import { getDb, isFirebaseConfigured } from "../firebase-admin";
import { queueNotification } from "./notifications";
import { createAuditLog } from "./audit";

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type DeliveryMethod = "collect" | "delivery";
export type FulfillmentStatus =
  | "not_required"
  | "awaiting_payment"
  | "pickup_pending"
  | "ready_for_dispatch"
  | "out_for_delivery"
  | "delivered"
  | "collected"
  | "issue";
export type RefundCaseStatus = "open" | "investigating" | "approved" | "rejected" | "refunded" | "closed";
export type RefundCaseReason = "gateway_failure" | "duplicate_charge" | "customer_request" | "manual_review";

export type ShippingSnapshot = {
  deliveryMethod: DeliveryMethod;
  zoneId?: string;
  zoneName?: string;
  quoteId?: string;
  etaMinHours?: number;
  etaMaxHours?: number;
  address?: string;
  instructions?: string;
  recipientName?: string;
  recipientPhone?: string;
  status: FulfillmentStatus;
  updatedAt: string;
};

export type RefundCase = {
  id: string;
  orderReference: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  amountUsd?: number;
  currencyCode?: string;
  paymentMethod?: string;
  gatewayReference?: string;
  reason: RefundCaseReason;
  status: RefundCaseStatus;
  notes: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
};

export type Order = {
  id: string;
  orderNumber?: string;
  invoiceNumber?: string;
  items: OrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  taxLabel?: string;
  taxRatePercent?: number;
  taxTotal?: number;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  status: OrderStatus;
  totalUsd?: number;
  subtotalUsd?: number;
  deliveryFeeUsd?: number;
  taxTotalUsd?: number;
  currencyCode?: string;
  exchangeRate?: number;
  paymentMeta?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  paymentMethod?: string;
  notes?: string;
  shipping?: ShippingSnapshot;
  refundCaseIds?: string[];
};

export async function listOrders(): Promise<Order[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const db = getDb();
  const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
    } as Order;
  });
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const db = getDb();
  const doc = await db.collection("orders").doc(id).get();

  if (!doc.exists) return null;

  return {
    id: doc.id,
    ...doc.data(),
  } as Order;
}

export async function listRefundCases(filters: {
  orderReference?: string;
  customerEmail?: string;
  status?: RefundCaseStatus;
} = {}): Promise<RefundCase[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const db = getDb();
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection("refund_cases");

  if (filters.orderReference) {
    query = query.where("orderReference", "==", filters.orderReference);
  }

  if (filters.customerEmail) {
    query = query.where("customerEmail", "==", filters.customerEmail.toLowerCase());
  }

  if (filters.status) {
    query = query.where("status", "==", filters.status);
  }

  const snapshot = await query.orderBy("createdAt", "desc").get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as RefundCase);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await requireStaffPermission("orders.edit");

  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const db = getDb();
  await db.collection("orders").doc(id).update({
    status,
    updatedAt: new Date().toISOString(),
  });
  await createAuditLog({
    action: "order_status_updated",
    targetType: "order",
    targetId: id,
    detail: `Order status changed to ${status}.`,
    meta: { status },
  });
}

export async function updateOrderShippingStatus(id: string, shippingStatus: FulfillmentStatus): Promise<void> {
  await requireStaffPermission("orders.edit");

  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const db = getDb();
  const timestamp = new Date().toISOString();
  const orderDoc = await db.collection("orders").doc(id).get();
  const current = orderDoc.exists ? ({ id: orderDoc.id, ...orderDoc.data() } as Order) : null;
  await db.collection("orders").doc(id).set(
    {
      shipping: {
        status: shippingStatus,
        updatedAt: timestamp,
      },
      updatedAt: timestamp,
    },
    { merge: true },
  );
  const { updateShipmentForOrder } = await import("./shipments");
  await updateShipmentForOrder({
    orderReference: id,
    status: shippingStatus,
  });
  await createAuditLog({
    action: "order_shipping_updated",
    targetType: "order",
    targetId: id,
    detail: `Order shipping status changed to ${shippingStatus}.`,
    meta: { shippingStatus },
  });

  if (current?.customerEmail) {
    const type = shippingStatus === "delivered" || shippingStatus === "collected" ? "order_delivered" : "order_shipped";
    const subject = shippingStatus === "delivered" || shippingStatus === "collected"
      ? `Order ${id} delivered`
      : `Order ${id} fulfillment updated`;
    const body = shippingStatus === "delivered" || shippingStatus === "collected"
      ? "Your order has been completed successfully."
      : `Your order status is now ${shippingStatus.replaceAll("_", " ")}.`;

    await queueNotification({
      eventKey: `shipping:${id}:${shippingStatus}`,
      type,
      audience: "customer",
      customerEmail: current.customerEmail,
      customerName: current.customerName,
      orderReference: id,
      channels: ["email", "in_app"],
      subject,
      body,
      meta: {
        shippingStatus,
      },
    });
  }
}

export async function updateRefundCaseStatus(
  refundCaseId: string,
  status: RefundCaseStatus,
  note?: string,
): Promise<void> {
  await requireStaffPermission("refunds.manage");

  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const db = getDb();
  const refundRef = db.collection("refund_cases").doc(refundCaseId);
  const refundDoc = await refundRef.get();
  if (!refundDoc.exists) {
    throw new Error("Refund case not found");
  }

  const current = refundDoc.data() as Partial<RefundCase>;
  const timestamp = new Date().toISOString();
  const notes = Array.isArray(current.notes) ? [...current.notes] : [];
  if (note?.trim()) {
    notes.push(`${timestamp}: ${note.trim()}`);
  }

  await refundRef.set(
    {
      status,
      notes,
      updatedAt: timestamp,
      resolvedAt: status === "refunded" || status === "closed" || status === "rejected" ? timestamp : null,
    },
    { merge: true },
  );
  await createAuditLog({
    action: "refund_status_updated",
    targetType: "refund_case",
    targetId: refundCaseId,
    detail: `Refund case moved to ${status}.${note?.trim() ? ` ${note.trim()}` : ""}`,
    meta: { status, note: note?.trim() || undefined },
  });

  if (status === "approved") {
    const { ensureRefundExecutionForCase } = await import("./refunds");
    await ensureRefundExecutionForCase(refundCaseId);
  }

  if (status === "refunded") {
    await requireStaffRoles(["admin"]);
    const { updateRefundExecutionStatus } = await import("./refunds");
    await updateRefundExecutionStatus({
      refundCaseId,
      status: "completed",
    });
  }

  if (current.customerEmail && current.orderReference) {
    await queueNotification({
      eventKey: `refund:${refundCaseId}:${status}`,
      type: "refund_status_updated",
      audience: "customer",
      customerEmail: current.customerEmail,
      customerName: current.customerName,
      orderReference: current.orderReference,
      refundCaseId,
      channels: ["email", "in_app"],
      subject: `Refund update for order ${current.orderReference}`,
      body: `Your refund case is now ${status}.`,
      meta: {
        refundCaseId,
        status,
        note: note?.trim() || undefined,
      },
    });
  }
}
