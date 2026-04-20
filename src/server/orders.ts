import type {
  DeliveryMethod,
  FulfillmentStatus,
  Order,
  OrderStatus,
  RefundCaseReason,
  RefundCaseStatus,
} from "@/lib/firestore/orders";
import crypto from "crypto";

type InternalOrderStatus = Order["status"];
type OrderStatusUpdateSource = "gateway" | "admin" | "system";

type SetOrderStatusOptions = {
  source?: OrderStatusUpdateSource;
  recordPaymentEvent?: boolean;
  queuePaymentNotification?: boolean;
  queueFulfilmentNotification?: boolean;
  createRefundCaseOnCancel?: boolean;
};

type PendingOrderInput = {
  reference: string;
  orderNumber?: string;
  invoiceNumber?: string;
  items: Order["items"];
  subtotal: number;
  deliveryFee: number;
  taxLabel?: string;
  taxRatePercent?: number;
  taxTotal?: number;
  total: number;
  subtotalUsd?: number;
  deliveryFeeUsd?: number;
  taxTotalUsd?: number;
  totalUsd?: number;
  currencyCode?: "840" | "924";
  exchangeRate?: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryInstructions?: string;
  deliveryMethod: DeliveryMethod;
  deliveryZoneId?: string;
  deliveryZoneName?: string;
  deliveryQuoteId?: string;
  deliveryEtaMinHours?: number;
  deliveryEtaMaxHours?: number;
  recipientName?: string;
  recipientPhone?: string;
  paymentMethod: string;
  gatewayReference?: string;
  notes?: string;
};

type CustomerShippingAddress = {
  label: string;
  address: string;
  instructions?: string;
  recipientName?: string;
  recipientPhone?: string;
  lastUsedAt: string;
  isDefault?: boolean;
};

function mapOrderStatusToFulfillment(status: InternalOrderStatus, deliveryMethod: DeliveryMethod): FulfillmentStatus {
  if (status === "cancelled") return "issue";
  if (deliveryMethod === "collect") {
    if (status === "delivered") return "collected";
    if (status === "processing" || status === "shipped") return "pickup_pending";
    return "awaiting_payment";
  }
  if (status === "delivered") return "delivered";
  if (status === "shipped") return "out_for_delivery";
  if (status === "processing") return "ready_for_dispatch";
  return "awaiting_payment";
}

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

const CONFIRMED_PAYMENT_INTENT_STATUSES = new Set(["paid", "processing", "refunded"]);
const CONFIRMED_GATEWAY_ORDER_STATUSES = new Set(["processing", "shipped", "delivered"]);
const CONFIRMED_GATEWAY_PAYMENT_STATUSES = new Set(["paid", "success", "processing", "awaiting delivery"]);

export function hasConfirmedPaymentForOrder(input: {
  orderStatus?: Order["status"];
  gatewayStatus?: string | null;
  paymentIntentStatus?: string | null;
}) {
  const orderStatus = input.orderStatus?.toLowerCase();
  const gatewayStatus = input.gatewayStatus?.toLowerCase();
  const paymentIntentStatus = input.paymentIntentStatus?.toLowerCase();

  return (
    (orderStatus ? CONFIRMED_GATEWAY_ORDER_STATUSES.has(orderStatus) : false)
    || (gatewayStatus ? CONFIRMED_GATEWAY_PAYMENT_STATUSES.has(gatewayStatus) : false)
    || (paymentIntentStatus ? CONFIRMED_PAYMENT_INTENT_STATUSES.has(paymentIntentStatus) : false)
  );
}

export function canAdminTransitionOrderStatus(input: {
  currentStatus: OrderStatus;
  nextStatus: OrderStatus;
  paymentConfirmed: boolean;
}) {
  const { currentStatus, nextStatus, paymentConfirmed } = input;

  if (currentStatus === nextStatus) {
    return { allowed: true as const };
  }

  if (currentStatus === "cancelled") {
    return {
      allowed: false as const,
      reason: "Cancelled orders cannot be reopened from admin. Create a new order or reconcile the payment record first.",
    };
  }

  if (currentStatus === "delivered" && nextStatus !== "delivered") {
    return {
      allowed: false as const,
      reason: "Delivered orders should not be moved backwards from admin. Use shipment updates or a refund workflow instead.",
    };
  }

  if (!paymentConfirmed && ["processing", "shipped", "delivered"].includes(nextStatus)) {
    return {
      allowed: false as const,
      reason: "Payment is not confirmed yet. Keep the order pending or cancel it until the payment path finishes.",
    };
  }

  if ((currentStatus === "processing" || currentStatus === "shipped") && nextStatus === "pending") {
    return {
      allowed: false as const,
      reason: "Orders that already started fulfilment should not be moved back to pending from admin.",
    };
  }

  return { allowed: true as const };
}

export function formatOrderStatusLabel(status: OrderStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}

export function shouldQueueGenericOrderStatusNotification(input: {
  previousStatus?: OrderStatus | null;
  nextStatus: OrderStatus;
  queuePaymentNotification: boolean;
  queueFulfilmentNotification: boolean;
}) {
  if (!input.previousStatus || input.previousStatus === input.nextStatus) {
    return false;
  }

  const sendsSpecializedPaymentNotification = input.queuePaymentNotification
    && (input.nextStatus === "processing" || input.nextStatus === "cancelled");
  const sendsSpecializedFulfilmentNotification = input.queueFulfilmentNotification
    && (input.nextStatus === "shipped" || input.nextStatus === "delivered");

  return !sendsSpecializedPaymentNotification && !sendsSpecializedFulfilmentNotification;
}

function buildHash(prefix: string, payload: Record<string, unknown>) {
  return `${prefix}_${crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
}

function buildEventId(reference: string, status: string, meta?: Record<string, unknown>) {
  return buildHash("event", {
    reference,
    status,
    gatewayRef: meta?.gatewayReference ?? meta?.transactionReference ?? null,
  });
}

function buildEngagementId(email: string, type: string, reference: string, detail?: string) {
  return buildHash("engagement", { email, type, reference, detail: detail ?? null });
}

function buildRefundCaseId(reference: string, gatewayReference?: string) {
  return buildHash("refund", { reference, gatewayReference: gatewayReference ?? null });
}

function buildNotificationEventKey(type: string, reference: string, detail?: string) {
  return buildHash("notification", { type, reference, detail: detail ?? null });
}

function sortByCreatedAt<T extends Record<string, unknown> & { createdAt?: unknown }>(
  items: T[],
  direction: "asc" | "desc" = "asc",
) {
  return [...items].sort((a, b) => {
    const aTime = typeof a.createdAt === "string" ? Date.parse(a.createdAt) : 0;
    const bTime = typeof b.createdAt === "string" ? Date.parse(b.createdAt) : 0;
    return direction === "asc" ? aTime - bTime : bTime - aTime;
  });
}

async function getOrdersDb() {
  const { getDb } = await import("@/lib/firebase-admin");
  return getDb();
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

function normalizeAddressKey(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function upsertShippingAddress(
  existing: CustomerShippingAddress[],
  incoming: CustomerShippingAddress,
): CustomerShippingAddress[] {
  const incomingKey = normalizeAddressKey(incoming.address);
  const next = existing
    .filter(address => normalizeAddressKey(address.address) !== incomingKey)
    .map(address => ({ ...address, isDefault: false }));

  next.unshift({ ...incoming, isDefault: true });
  return next.slice(0, 5);
}

async function recordCustomerEngagement(input: {
  customerEmail: string;
  customerName?: string;
  orderReference?: string;
  type: string;
  title: string;
  detail?: string;
  meta?: Record<string, unknown>;
}) {
  const db = await getOrdersDb();
  const engagementId = buildEngagementId(
    input.customerEmail.toLowerCase(),
    input.type,
    input.orderReference ?? "general",
    input.detail,
  );

  await db.collection("customer_engagements").doc(engagementId).set(
    stripUndefined({
      customerEmail: input.customerEmail.toLowerCase(),
      customerName: input.customerName,
      orderReference: input.orderReference,
      type: input.type,
      title: input.title,
      detail: input.detail,
      meta: input.meta,
      createdAt: new Date().toISOString(),
    }),
    { merge: true },
  );
}

async function queueCustomerNotification(input: {
  type:
    | "order_pending"
    | "order_status_updated"
    | "payment_processing"
    | "payment_failed"
    | "payment_cancelled"
    | "order_shipped"
    | "order_delivered"
    | "refund_requested"
    | "refund_status_updated";
  customerEmail: string;
  customerName?: string;
  orderReference: string;
  subject: string;
  body: string;
  detail?: string;
  refundCaseId?: string;
  meta?: Record<string, unknown>;
}) {
  const { queueNotification } = await import("@/lib/firestore/notifications");
  await queueNotification({
    eventKey: buildNotificationEventKey(input.type, input.orderReference, input.detail ?? input.refundCaseId),
    type: input.type,
    audience: "customer",
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    orderReference: input.orderReference,
    refundCaseId: input.refundCaseId,
    channels: ["email", "in_app"],
    subject: input.subject,
    body: input.body,
    meta: input.meta,
  });
}

async function ensureRefundCaseForPaymentIssue(input: {
  order: Order;
  gatewayReference?: string;
  reason: RefundCaseReason;
  detail: string;
}) {
  const db = await getOrdersDb();
  const refundCaseId = buildRefundCaseId(input.order.id, input.gatewayReference);
  const refundRef = db.collection("refund_cases").doc(refundCaseId);
  const refundDoc = await refundRef.get();
  const timestamp = new Date().toISOString();

  const notes = refundDoc.exists && Array.isArray(refundDoc.data()?.notes)
    ? [...(refundDoc.data()?.notes as string[])]
    : [];
  if (!notes.includes(input.detail)) {
    notes.push(input.detail);
  }

  await refundRef.set(stripUndefined({
    orderReference: input.order.id,
    customerEmail: input.order.customerEmail.toLowerCase(),
    customerName: input.order.customerName,
    amount: input.order.total,
    amountUsd: input.order.totalUsd,
    currencyCode: input.order.currencyCode,
    paymentMethod: input.order.paymentMethod,
    gatewayReference: input.gatewayReference,
    reason: input.reason,
    status: "investigating" as RefundCaseStatus,
    notes,
    createdAt: refundDoc.data()?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }), { merge: true });

  await db.collection("orders").doc(input.order.id).set({
    refundCaseIds: [...new Set([...(input.order.refundCaseIds ?? []), refundCaseId])],
    updatedAt: timestamp,
  }, { merge: true });

  await db.collection("customers").doc(input.order.customerEmail.toLowerCase()).set({
    lastPaymentIssueAt: timestamp,
    updatedAt: timestamp,
  }, { merge: true });

  await recordCustomerEngagement({
    customerEmail: input.order.customerEmail,
    customerName: input.order.customerName,
    orderReference: input.order.id,
    type: "refund_issue",
    title: "Payment issue opened",
    detail: input.detail,
    meta: {
      refundCaseId,
      gatewayReference: input.gatewayReference,
    },
  });
}

export async function createCustomerRefundRequest(input: {
  reference: string;
  customerEmail: string;
  detail: string;
}) {
  const db = await getOrdersDb();
  const order = await getOrder(input.reference);
  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.customerEmail.toLowerCase() !== input.customerEmail.toLowerCase()) {
    throw new Error("You are not authorized to request a refund for this order.");
  }

  const existingSnapshot = await db
    .collection("refund_cases")
    .where("orderReference", "==", input.reference)
    .orderBy("createdAt", "desc")
    .get();

  const existingCustomerRequest = existingSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }) as { id: string; status?: string; reason?: string })
    .find(refund => refund.reason === "customer_request" && !["closed", "rejected"].includes(refund.status ?? ""));

  if (existingCustomerRequest) {
    return { refundCaseId: existingCustomerRequest.id, alreadyExists: true };
  }

  const timestamp = new Date().toISOString();
  const refundCaseId = buildHash("refund_request", {
    reference: input.reference,
    customerEmail: input.customerEmail.toLowerCase(),
  });

  await db.collection("refund_cases").doc(refundCaseId).set(stripUndefined({
    orderReference: order.id,
    customerEmail: order.customerEmail.toLowerCase(),
    customerName: order.customerName,
    amount: order.total,
    amountUsd: order.totalUsd,
    currencyCode: order.currencyCode,
    paymentMethod: order.paymentMethod,
    gatewayReference:
      typeof order.paymentMeta?.gatewayReference === "string"
        ? order.paymentMeta.gatewayReference
        : undefined,
    reason: "customer_request" as RefundCaseReason,
    status: "open" as RefundCaseStatus,
    notes: [`${timestamp}: Customer refund request submitted. ${input.detail.trim()}`],
    createdAt: timestamp,
    updatedAt: timestamp,
  }), { merge: true });

  await db.collection("orders").doc(order.id).set({
    refundCaseIds: [...new Set([...(order.refundCaseIds ?? []), refundCaseId])],
    updatedAt: timestamp,
  }, { merge: true });

  await db.collection("customers").doc(order.customerEmail.toLowerCase()).set({
    lastPaymentIssueAt: timestamp,
    updatedAt: timestamp,
  }, { merge: true });

  await recordCustomerEngagement({
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    orderReference: order.id,
    type: "refund_request",
    title: "Refund requested by customer",
    detail: input.detail.trim(),
    meta: {
      refundCaseId,
    },
  });

  await queueCustomerNotification({
    type: "refund_requested",
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    orderReference: order.id,
    refundCaseId,
    detail: input.detail.trim(),
    subject: `Refund request received for order ${order.id}`,
    body: `We have opened a refund review for your order ${order.id}. Reason received: ${input.detail.trim()}`,
    meta: {
      refundCaseId,
      status: "open",
    },
  });

  return { refundCaseId, alreadyExists: false };
}

export async function createPendingOrder(input: PendingOrderInput) {
  const db = await getOrdersDb();
  const timestamp = new Date().toISOString();
  const customerEmail = input.customerEmail.toLowerCase();
  const customerRef = db.collection("customers").doc(customerEmail);
  const customerDoc = await customerRef.get();
  const existingCustomer = (customerDoc.data() ?? {}) as {
    createdAt?: string;
    shippingAddresses?: CustomerShippingAddress[];
    paymentMethodsUsed?: string[];
  };

  const shippingAddress = input.customerAddress
    ? {
        label: input.deliveryMethod === "delivery" ? "Delivery Address" : "Pickup Contact",
        address: input.customerAddress,
        instructions: input.deliveryInstructions,
        recipientName: input.recipientName ?? input.customerName,
        recipientPhone: input.recipientPhone ?? input.customerPhone,
        lastUsedAt: timestamp,
        isDefault: true,
      }
    : undefined;

  const paymentMethodsUsed = Array.isArray(existingCustomer.paymentMethodsUsed)
    ? [...existingCustomer.paymentMethodsUsed]
    : [];
  const nextPaymentMethod = input.paymentMethod.toUpperCase();
  if (!paymentMethodsUsed.includes(nextPaymentMethod)) {
    paymentMethodsUsed.push(nextPaymentMethod);
  }

  const shippingAddresses = shippingAddress
    ? upsertShippingAddress(
        Array.isArray(existingCustomer.shippingAddresses) ? existingCustomer.shippingAddresses : [],
        shippingAddress,
      )
    : existingCustomer.shippingAddresses ?? [];

  await customerRef.set(stripUndefined({
    email: input.customerEmail,
    name: input.customerName,
    phone: input.customerPhone,
    address: input.customerAddress,
    shippingAddresses,
    preferredDeliveryMethod: input.deliveryMethod,
    paymentMethodsUsed,
    lastOrderReference: input.reference,
    lastOrderAt: timestamp,
    updatedAt: timestamp,
    createdAt: existingCustomer.createdAt ?? timestamp,
  }), { merge: true });

  await db.collection("orders").doc(input.reference).set(stripUndefined({
    id: input.reference,
    reference: input.reference,
    orderNumber: input.orderNumber,
    invoiceNumber: input.invoiceNumber,
    items: input.items,
    subtotal: input.subtotal,
    deliveryFee: input.deliveryFee,
    taxLabel: input.taxLabel,
    taxRatePercent: input.taxRatePercent,
    taxTotal: input.taxTotal,
    total: input.total,
    subtotalUsd: input.subtotalUsd,
    deliveryFeeUsd: input.deliveryFeeUsd,
    taxTotalUsd: input.taxTotalUsd,
    totalUsd: input.totalUsd,
    currencyCode: input.currencyCode ?? "840",
    exchangeRate: input.exchangeRate,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    customerAddress: input.customerAddress,
    status: "pending",
    paymentMethod: input.paymentMethod,
    gatewayReference: input.gatewayReference,
    notes: input.notes,
    shipping: {
      deliveryMethod: input.deliveryMethod,
      zoneId: input.deliveryZoneId,
      zoneName: input.deliveryZoneName,
      quoteId: input.deliveryQuoteId,
      etaMinHours: input.deliveryEtaMinHours,
      etaMaxHours: input.deliveryEtaMaxHours,
      address: input.customerAddress,
      instructions: input.deliveryInstructions,
      recipientName: input.recipientName ?? input.customerName,
      recipientPhone: input.recipientPhone ?? input.customerPhone,
      status: mapOrderStatusToFulfillment("pending", input.deliveryMethod),
      updatedAt: timestamp,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  await recordCustomerEngagement({
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    orderReference: input.reference,
    type: "checkout_started",
    title: "Checkout initiated",
    detail: `${input.items.length} item(s) via ${input.paymentMethod.toUpperCase()}.`,
    meta: {
      total: input.total,
      currencyCode: input.currencyCode ?? "840",
      deliveryMethod: input.deliveryMethod,
    },
  });

  await queueCustomerNotification({
    type: "order_pending",
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    orderReference: input.reference,
    subject: `Order ${input.reference} received`,
    body: `Your order has been created and is awaiting payment confirmation. Total: ${input.total.toFixed(2)} ${input.currencyCode ?? "840"}.`,
    meta: {
      total: input.total,
      currencyCode: input.currencyCode ?? "840",
      paymentMethod: input.paymentMethod,
      deliveryMethod: input.deliveryMethod,
    },
  });

  const { ensureShipmentForOrder } = await import("@/lib/firestore/shipments");
  await ensureShipmentForOrder({
    orderReference: input.reference,
    deliveryMethod: input.deliveryMethod,
    status: mapOrderStatusToFulfillment("pending", input.deliveryMethod),
    zoneId: input.deliveryZoneId,
    zoneName: input.deliveryZoneName,
  });
}

export async function getOrderTransactionReport(reference: string) {
  const db = await getOrdersDb();
  const orderDoc = await db.collection("orders").doc(reference).get();
  if (!orderDoc.exists) return null;

  const [eventsSnapshot, refundsSnapshot, engagementSnapshot] = await Promise.all([
    db.collection("payment_events").where("reference", "==", reference).get(),
    db.collection("refund_cases").where("orderReference", "==", reference).get(),
    db.collection("customer_engagements").where("orderReference", "==", reference).get(),
  ]);

  const eventRows = eventsSnapshot.docs.map(
    doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { createdAt?: unknown },
  );
  const refundRows = refundsSnapshot.docs.map(
    doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { createdAt?: unknown },
  );
  const engagementRows = engagementSnapshot.docs.map(
    doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as Record<string, unknown> & { createdAt?: unknown },
  );

  const events = sortByCreatedAt(
    eventRows,
    "asc",
  );
  const refunds = sortByCreatedAt(
    refundRows,
    "desc",
  );
  const engagements = sortByCreatedAt(
    engagementRows,
    "asc",
  );

  return {
    order: { id: orderDoc.id, ...orderDoc.data() },
    events,
    refunds,
    engagements,
    generatedAt: new Date().toISOString(),
  };
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

export async function getOrder(reference: string) {
  const db = await getOrdersDb();
  const doc = await db.collection("orders").doc(reference).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Order & { paymentMeta?: Record<string, unknown> };
}

export async function setOrderStatus(
  reference: string,
  status: string,
  meta?: Record<string, unknown>,
  options?: SetOrderStatusOptions,
) {
  const db = await getOrdersDb();
  const eventId = buildEventId(reference, status, meta);
  const eventRef = db.collection("payment_events").doc(eventId);
  const orderRef = db.collection("orders").doc(reference);
  const timestamp = new Date().toISOString();
  let currentOrder: Order | null = null;
  let previousOrderStatus: OrderStatus | null = null;
  const internalStatus = mapExternalStatusToInternal(status);
  const source = options?.source ?? "gateway";
  const shouldRecordPaymentEvent = options?.recordPaymentEvent ?? (source === "gateway");
  const shouldQueuePaymentNotification = options?.queuePaymentNotification ?? (source === "gateway");
  const shouldQueueFulfilmentNotification = options?.queueFulfilmentNotification ?? (source === "admin");
  const shouldCreateRefundCaseOnCancel = options?.createRefundCaseOnCancel ?? (source === "gateway");

  await db.runTransaction(async tx => {
    const [eventDoc, orderDoc] = await Promise.all([tx.get(eventRef), tx.get(orderRef)]);
    if (!orderDoc.exists) {
      throw new Error(`Order ${reference} not found.`);
    }

    currentOrder = { id: orderDoc.id, ...orderDoc.data() } as Order;
    previousOrderStatus = currentOrder.status;

    if (shouldRecordPaymentEvent && !eventDoc.exists) {
      tx.set(eventRef, stripUndefined({
        reference,
        status,
        meta: meta ?? {},
        createdAt: timestamp,
      }));
    }

    tx.set(orderRef, stripUndefined({
      status: internalStatus,
      paymentMeta: {
        ...(currentOrder.paymentMeta ?? {}),
        ...(meta ?? {}),
        lastGatewayStatus: status,
      },
      shipping: {
        ...(currentOrder.shipping ?? {
          deliveryMethod: "collect",
        }),
        status: mapOrderStatusToFulfillment(
          internalStatus,
          currentOrder.shipping?.deliveryMethod ?? "collect",
        ),
        updatedAt: timestamp,
      },
      updatedAt: timestamp,
    }), { merge: true });

    tx.set(db.collection("customers").doc(currentOrder.customerEmail.toLowerCase()), stripUndefined({
      lastOrderReference: reference,
      lastOrderAt: currentOrder.createdAt,
      updatedAt: timestamp,
      lastPaymentIssueAt: internalStatus === "cancelled" && shouldCreateRefundCaseOnCancel ? timestamp : undefined,
    }), { merge: true });
  });

  const finalOrder = currentOrder ?? await getOrder(reference);
  if (!finalOrder) return;
  const shouldQueueGenericStatusNotification = shouldQueueGenericOrderStatusNotification({
    previousStatus: previousOrderStatus,
    nextStatus: internalStatus,
    queuePaymentNotification: shouldQueuePaymentNotification,
    queueFulfilmentNotification: shouldQueueFulfilmentNotification,
  });

  const { syncShipmentStatusForOrder } = await import("@/lib/firestore/shipments");
  await syncShipmentStatusForOrder(finalOrder);

  if (internalStatus === "processing") {
    const { consumeInventoryReservations } = await import("@/lib/firestore/inventory");
    await consumeInventoryReservations(reference);

    if (shouldQueuePaymentNotification) {
      await queueCustomerNotification({
        type: "payment_processing",
        customerEmail: finalOrder.customerEmail,
        customerName: finalOrder.customerName,
        orderReference: finalOrder.id,
        detail: status,
        subject: `Payment confirmed for order ${finalOrder.id}`,
        body: "Your payment was confirmed. We are preparing your order now.",
        meta: {
          gatewayStatus: status,
          gatewayReference:
            typeof meta?.gatewayReference === "string"
              ? meta.gatewayReference
              : typeof meta?.transactionReference === "string"
                ? meta.transactionReference
                : undefined,
        },
      });
    }
  }

  await recordCustomerEngagement({
    customerEmail: finalOrder.customerEmail,
    customerName: finalOrder.customerName,
    orderReference: finalOrder.id,
    type: source === "gateway" ? "payment_status" : "order_status",
    title: source === "gateway" ? "Payment status updated" : "Order status updated",
    detail: source === "gateway"
      ? `${status} received from payment gateway.`
      : `${internalStatus} set from admin operations.`,
    meta: {
      ...(meta ?? {}),
      statusSource: source,
    },
  });

  if (shouldQueueGenericStatusNotification) {
    await queueCustomerNotification({
      type: "order_status_updated",
      customerEmail: finalOrder.customerEmail,
      customerName: finalOrder.customerName,
      orderReference: finalOrder.id,
      detail: internalStatus,
      subject: `Order ${finalOrder.id} status updated`,
      body: `Your order status is now ${formatOrderStatusLabel(internalStatus)}.`,
      meta: {
        previousStatus: previousOrderStatus ?? undefined,
        status: internalStatus,
        statusSource: source,
      },
    });
  }

  if (internalStatus === "cancelled") {
    const { releaseInventoryReservations } = await import("@/lib/firestore/inventory");
    await releaseInventoryReservations(reference, `payment_${status.toLowerCase()}`);

    if (shouldCreateRefundCaseOnCancel) {
      await ensureRefundCaseForPaymentIssue({
        order: finalOrder,
        gatewayReference:
          typeof meta?.gatewayReference === "string"
            ? meta.gatewayReference
            : typeof meta?.transactionReference === "string"
              ? meta.transactionReference
              : undefined,
        reason: "gateway_failure",
        detail: `Payment status ${status} requires refund or manual reconciliation.`,
      });
    }

    if (shouldQueuePaymentNotification) {
      await queueCustomerNotification({
        type: status.toLowerCase().includes("cancel") ? "payment_cancelled" : "payment_failed",
        customerEmail: finalOrder.customerEmail,
        customerName: finalOrder.customerName,
        orderReference: finalOrder.id,
        detail: status,
        subject: `Payment issue for order ${finalOrder.id}`,
        body: `Your payment could not be completed. Current status: ${status}. Our team can review it if funds were deducted.`,
        meta: {
          gatewayStatus: status,
          gatewayReference:
            typeof meta?.gatewayReference === "string"
              ? meta.gatewayReference
              : typeof meta?.transactionReference === "string"
                ? meta.transactionReference
                : undefined,
        },
      });
    }
  }

  if (shouldQueueFulfilmentNotification && (internalStatus === "shipped" || internalStatus === "delivered")) {
    const type = internalStatus === "delivered" ? "order_delivered" : "order_shipped";
    const subject = internalStatus === "delivered"
      ? `Order ${finalOrder.id} delivered`
      : `Order ${finalOrder.id} shipped`;
    const body = internalStatus === "delivered"
      ? "Your order has been completed successfully."
      : "Your order is now on its way.";

    await queueCustomerNotification({
      type,
      customerEmail: finalOrder.customerEmail,
      customerName: finalOrder.customerName,
      orderReference: finalOrder.id,
      detail: internalStatus,
      subject,
      body,
      meta: {
        statusSource: source,
      },
    });
  }
}

export async function transitionOrderStatusFromAdmin(reference: string, status: OrderStatus, note?: string) {
  const { requireStaffPermission } = await import("@/lib/auth");
  const { getPaymentIntentByOrderReference } = await import("@/lib/firestore/payments");
  const { createAuditLog } = await import("@/lib/firestore/audit");

  await requireStaffPermission("orders.edit");

  const order = await getOrder(reference);
  if (!order) {
    throw new Error(`Order ${reference} not found.`);
  }

  const paymentIntent = await getPaymentIntentByOrderReference(reference);
  const paymentConfirmed = hasConfirmedPaymentForOrder({
    orderStatus: order.status,
    gatewayStatus: typeof order.paymentMeta?.lastGatewayStatus === "string"
      ? order.paymentMeta.lastGatewayStatus
      : null,
    paymentIntentStatus: paymentIntent?.status ?? null,
  });

  const transition = canAdminTransitionOrderStatus({
    currentStatus: order.status,
    nextStatus: status,
    paymentConfirmed,
  });
  if (!transition.allowed) {
    throw new Error(transition.reason);
  }

  await setOrderStatus(
    reference,
    status,
    {
      ...order.paymentMeta,
      adminStatusNote: note?.trim() || undefined,
      statusSource: "admin",
    },
    {
      source: "admin",
      recordPaymentEvent: false,
      queuePaymentNotification: paymentConfirmed && (status === "processing" || status === "cancelled"),
      queueFulfilmentNotification: status === "shipped" || status === "delivered",
      createRefundCaseOnCancel: paymentConfirmed,
    },
  );

  await createAuditLog({
    action: "order_status_updated",
    targetType: "order",
    targetId: reference,
    detail: `Order status changed to ${status}.${note?.trim() ? ` ${note.trim()}` : ""}`,
    meta: {
      status,
      paymentConfirmed,
      note: note?.trim() || undefined,
    },
  });
}
