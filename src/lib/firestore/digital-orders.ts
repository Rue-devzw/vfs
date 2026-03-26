"use server";

import { getDb, isFirebaseConfigured } from "../firebase-admin";
import type { DigitalServiceId } from "../digital-services";
import { requireStaffPermission } from "../auth";
import { createAuditLog } from "./audit";
import { queueNotification } from "./notifications";

export type DigitalOrderStatus = "pending" | "processing" | "completed" | "failed" | "manual_review";

export type DigitalOrderRecord = {
  id: string;
  orderReference: string;
  serviceId: DigitalServiceId;
  provider: string;
  accountReference: string;
  customerEmail?: string;
  customerName?: string;
  validationSnapshot?: Record<string, unknown>;
  provisioningStatus: DigitalOrderStatus;
  resultPayload?: Record<string, unknown>;
  token?: string;
  receiptNumber?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue).filter((entry) => entry !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, nested]) => [key, sanitizeValue(nested)])
        .filter((entry) => entry[1] !== undefined),
    );
  }

  return value === undefined ? undefined : value;
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return sanitizeValue(value) as T;
}

function buildDigitalOrderId(orderReference: string) {
  return `digital_${orderReference}`;
}

export async function upsertDigitalOrder(input: {
  orderReference: string;
  serviceId: DigitalServiceId;
  provider: string;
  accountReference: string;
  customerEmail?: string;
  customerName?: string;
  validationSnapshot?: Record<string, unknown>;
  provisioningStatus: DigitalOrderStatus;
  resultPayload?: Record<string, unknown>;
  token?: string;
  receiptNumber?: string;
  completedAt?: string;
}) {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const db = getDb();
  const id = buildDigitalOrderId(input.orderReference);
  const ref = db.collection("digital_orders").doc(id);
  const existing = await ref.get();
  const timestamp = new Date().toISOString();
  const current = existing.exists ? (existing.data() as Partial<DigitalOrderRecord>) : null;

  await ref.set(stripUndefined({
    orderReference: input.orderReference,
    serviceId: input.serviceId,
    provider: input.provider,
    accountReference: input.accountReference,
    customerEmail: input.customerEmail ?? current?.customerEmail,
    customerName: input.customerName ?? current?.customerName,
    validationSnapshot: input.validationSnapshot ?? current?.validationSnapshot,
    provisioningStatus: input.provisioningStatus,
    resultPayload: input.resultPayload ?? current?.resultPayload,
    token: input.token ?? current?.token,
    receiptNumber: input.receiptNumber ?? current?.receiptNumber,
    completedAt: input.completedAt ?? current?.completedAt,
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
  } satisfies Omit<DigitalOrderRecord, "id">), { merge: true });

  const doc = await ref.get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as DigitalOrderRecord) : null;
}

export async function getDigitalOrderByReference(orderReference: string): Promise<DigitalOrderRecord | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const doc = await getDb().collection("digital_orders").doc(buildDigitalOrderId(orderReference)).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as DigitalOrderRecord) : null;
}

async function requireAdminSession() {
  return requireStaffPermission("digital.view");
}

export async function listDigitalOrders(limit = 100): Promise<DigitalOrderRecord[]> {
  await requireAdminSession();
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDb().collection("digital_orders").orderBy("updatedAt", "desc").limit(limit).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as DigitalOrderRecord);
}

export async function listDigitalOrdersByCustomer(email: string): Promise<DigitalOrderRecord[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDb()
    .collection("digital_orders")
    .where("customerEmail", "==", email.toLowerCase())
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as DigitalOrderRecord);
}

function toServiceType(serviceId: DigitalServiceId) {
  return serviceId.toUpperCase() as Uppercase<DigitalServiceId>;
}

export async function retryDigitalOrderFulfilment(orderReference: string) {
  await requireStaffPermission("digital.manage");
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const current = await getDigitalOrderByReference(orderReference);
  if (!current) {
    throw new Error("Digital order not found.");
  }

  const { getOrder, setOrderStatus } = await import("@/server/orders");
  const { DigitalService } = await import("@/lib/digital-service-logic");
  const order = await getOrder(orderReference);
  if (!order) {
    throw new Error("Linked order not found.");
  }

  if (order.status === "cancelled") {
    throw new Error("Cancelled orders cannot be reprocessed.");
  }

  await upsertDigitalOrder({
    orderReference,
    serviceId: current.serviceId,
    provider: current.provider,
    accountReference: current.accountReference,
    customerEmail: current.customerEmail,
    customerName: current.customerName,
    validationSnapshot: current.validationSnapshot,
    provisioningStatus: "processing",
    resultPayload: {
      ...(current.resultPayload ?? {}),
      retriedAt: new Date().toISOString(),
    },
  });

  try {
    const serviceMeta = order.paymentMeta && typeof order.paymentMeta.serviceMeta === "object" && order.paymentMeta.serviceMeta !== null
      ? Object.fromEntries(
        Object.entries(order.paymentMeta.serviceMeta as Record<string, unknown>)
          .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      )
      : undefined;

    const result = await DigitalService.vendDigitalFulfilment(toServiceType(current.serviceId), {
      orderReference,
      accountNumber: current.accountReference,
      amountUsd: order.totalUsd ?? order.total,
      serviceMeta: {
        ...(serviceMeta ?? {}),
        customerName: order.customerName,
        customerMobile: order.customerPhone ?? "",
        currencyCode: order.currencyCode ?? "840",
      },
    });

    if (!result.success) {
      throw new Error(result.message || "Digital fulfilment failed.");
    }

    await upsertDigitalOrder({
      orderReference,
      serviceId: current.serviceId,
      provider: current.provider,
      accountReference: current.accountReference,
      customerEmail: current.customerEmail,
      customerName: current.customerName,
      validationSnapshot: current.validationSnapshot,
      provisioningStatus: "completed",
      resultPayload: result.raw ?? { success: true },
      token: result.token,
      receiptNumber: result.receiptNumber,
      completedAt: new Date().toISOString(),
    });

    await setOrderStatus(orderReference, "SUCCESS", {
      ...(order.paymentMeta ?? {}),
      token: result.token,
      units: result.units,
      receiptNumber: result.receiptNumber,
      vendedAt: new Date().toISOString(),
      accountNumber: current.accountReference,
      serviceType: toServiceType(current.serviceId),
    });

    await createAuditLog({
      action: "digital_reprocessed",
      targetType: "digital_order",
      targetId: current.id,
      detail: `Digital order ${orderReference} reprocessed successfully.`,
      meta: {
        serviceId: current.serviceId,
        receiptNumber: result.receiptNumber,
        hasToken: Boolean(result.token),
      },
    });

    await queueNotification({
      eventKey: `digital:${orderReference}:completed`,
      type: "digital_fulfilment_completed",
      audience: "customer",
      customerEmail: current.customerEmail,
      customerName: current.customerName,
      orderReference,
      channels: ["email", "in_app"],
      subject: `Your ${current.serviceId.toUpperCase()} fulfilment is complete`,
      body: `${current.serviceId.toUpperCase()} fulfilment completed successfully.${result.token ? ` Token: ${result.token}.` : ""}${result.receiptNumber ? ` Receipt: ${result.receiptNumber}.` : ""}`,
      meta: {
        serviceId: current.serviceId,
        receiptNumber: result.receiptNumber,
        token: result.token,
      },
    });

    return { success: true, status: "completed" as const };
  } catch (error) {
    await upsertDigitalOrder({
      orderReference,
      serviceId: current.serviceId,
      provider: current.provider,
      accountReference: current.accountReference,
      customerEmail: current.customerEmail,
      customerName: current.customerName,
      validationSnapshot: current.validationSnapshot,
      provisioningStatus: "manual_review",
      resultPayload: {
        ...(current.resultPayload ?? {}),
        error: error instanceof Error ? error.message : "Digital fulfilment failed.",
        retriedAt: new Date().toISOString(),
      },
    });

    await createAuditLog({
      action: "digital_reprocessed",
      targetType: "digital_order",
      targetId: current.id,
      detail: `Digital order ${orderReference} reprocess failed.`,
      meta: {
        serviceId: current.serviceId,
        error: error instanceof Error ? error.message : "Digital fulfilment failed.",
      },
    });

    await queueNotification({
      eventKey: `digital:${orderReference}:issue`,
      type: "digital_fulfilment_issue",
      audience: "customer",
      customerEmail: current.customerEmail,
      customerName: current.customerName,
      orderReference,
      channels: ["email", "in_app"],
      subject: `Your ${current.serviceId.toUpperCase()} fulfilment needs review`,
      body: "We retried your digital fulfilment, but it still needs manual review. Support can now follow up with the recorded provider response.",
      meta: {
        serviceId: current.serviceId,
        error: error instanceof Error ? error.message : "Digital fulfilment failed.",
      },
    });

    throw error;
  }
}
