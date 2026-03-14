import crypto from "crypto";
import { requireStaffPermission } from "../auth";
import { getDb, isFirebaseConfigured } from "../firebase-admin";
import type { Order } from "./orders";

export type PaymentIntentStatus =
  | "created"
  | "submitted"
  | "pending_confirmation"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type PaymentIntent = {
  id: string;
  orderReference: string;
  provider: string;
  paymentMethod: string;
  amount: number;
  currencyCode?: string;
  idempotencyKey?: string;
  gatewayReference?: string;
  paymentUrl?: string;
  status: PaymentIntentStatus;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WebhookInboxRecord = {
  id: string;
  provider: string;
  signature?: string | null;
  payload: Record<string, unknown>;
  status: "received" | "processed" | "failed";
  error?: string;
  receivedAt: string;
  processedAt?: string;
};

export type PaymentEventRecord = {
  id: string;
  reference: string;
  status: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export type PaymentOpsSummary = {
  totalIntents: number;
  paidIntents: number;
  failedIntents: number;
  processingIntents: number;
  pendingIntents: number;
  failedWebhooks: number;
  receivedWebhooks: number;
  reconciliationAlerts: number;
};

function buildIntentId(orderReference: string) {
  return `pi_${orderReference}`;
}

function buildWebhookId(provider: string, payload: Record<string, unknown>) {
  return `wh_${provider}_${crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
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

export function mapGatewayStatusToPaymentIntent(status: string): PaymentIntentStatus {
  switch (status.toLowerCase()) {
    case "success":
    case "paid":
      return "paid";
    case "processing":
    case "awaiting delivery":
      return "processing";
    case "failed":
    case "expired":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "sent":
    case "pending":
    default:
      return "submitted";
  }
}

export async function getPaymentIntentByOrderReference(orderReference: string): Promise<PaymentIntent | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const db = getDb();
  const doc = await db.collection("payment_intents").doc(buildIntentId(orderReference)).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as PaymentIntent;
}

export async function getPaymentIntentByIdempotencyKey(idempotencyKey: string): Promise<PaymentIntent | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const db = getDb();
  const snapshot = await db
    .collection("payment_intents")
    .where("idempotencyKey", "==", idempotencyKey)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as PaymentIntent;
}

export async function upsertPaymentIntent(input: {
  orderReference: string;
  provider: string;
  paymentMethod: string;
  amount?: number;
  currencyCode?: string;
  idempotencyKey?: string;
  gatewayReference?: string;
  paymentUrl?: string;
  status: PaymentIntentStatus;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
}) {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const db = getDb();
  const timestamp = new Date().toISOString();
  const intentId = buildIntentId(input.orderReference);
  const existingDoc = await db.collection("payment_intents").doc(intentId).get();
  const existing = existingDoc.exists ? (existingDoc.data() as PaymentIntent) : null;

  await db.collection("payment_intents").doc(intentId).set(stripUndefined({
    orderReference: input.orderReference,
    provider: input.provider ?? existing?.provider,
    paymentMethod: input.paymentMethod ?? existing?.paymentMethod,
    amount: input.amount ?? existing?.amount ?? 0,
    currencyCode: input.currencyCode ?? existing?.currencyCode,
    idempotencyKey: input.idempotencyKey ?? existing?.idempotencyKey,
    gatewayReference: input.gatewayReference ?? existing?.gatewayReference,
    paymentUrl: input.paymentUrl ?? existing?.paymentUrl,
    status: input.status,
    requestPayload: input.requestPayload ?? existing?.requestPayload,
    responsePayload: input.responsePayload ?? existing?.responsePayload,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }), { merge: true });

  return getPaymentIntentByOrderReference(input.orderReference);
}

export async function recordWebhookInbox(provider: string, payload: Record<string, unknown>, signature?: string | null) {
  if (!isFirebaseConfigured()) {
    return { alreadyProcessed: false, id: buildWebhookId(provider, payload) };
  }

  const db = getDb();
  const id = buildWebhookId(provider, payload);
  const ref = db.collection("webhook_inbox").doc(id);
  const doc = await ref.get();
  const existing = doc.data() as WebhookInboxRecord | undefined;

  if (existing?.status === "processed") {
    return { alreadyProcessed: true, id };
  }

  await ref.set(stripUndefined({
    provider,
    signature: signature ?? null,
    payload,
    status: existing?.status ?? "received",
    receivedAt: existing?.receivedAt ?? new Date().toISOString(),
  }), { merge: true });

  return { alreadyProcessed: false, id };
}

export async function markWebhookInboxStatus(id: string, status: "processed" | "failed", error?: string) {
  if (!isFirebaseConfigured()) {
    return;
  }

  const db = getDb();
  await db.collection("webhook_inbox").doc(id).set(stripUndefined({
    status,
    error,
    processedAt: new Date().toISOString(),
  }), { merge: true });
}

async function requireAdminSession() {
  return requireStaffPermission("payments.view");
}

export async function listPaymentIntents(): Promise<PaymentIntent[]> {
  await requireAdminSession();
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDb().collection("payment_intents").orderBy("updatedAt", "desc").limit(100).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PaymentIntent);
}

export async function listWebhookInbox(): Promise<WebhookInboxRecord[]> {
  await requireAdminSession();
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDb().collection("webhook_inbox").orderBy("receivedAt", "desc").limit(100).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as WebhookInboxRecord);
}

export async function listPaymentEvents(): Promise<PaymentEventRecord[]> {
  await requireAdminSession();
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDb().collection("payment_events").orderBy("createdAt", "desc").limit(100).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PaymentEventRecord);
}

function hasReconciliationAlert(order: Order, intent: PaymentIntent | undefined) {
  if (!intent) {
    return order.status !== "pending";
  }

  if (order.status === "processing" && !["paid", "processing"].includes(intent.status)) {
    return true;
  }
  if (order.status === "cancelled" && !["failed", "cancelled", "refunded"].includes(intent.status)) {
    return true;
  }
  if (order.status === "pending" && ["paid", "failed", "cancelled", "refunded"].includes(intent.status)) {
    return true;
  }
  return false;
}

export async function getPaymentOpsSummary(orders: Order[]) {
  await requireAdminSession();
  if (!isFirebaseConfigured()) {
    return {
      summary: {
        totalIntents: 0,
        paidIntents: 0,
        failedIntents: 0,
        processingIntents: 0,
        pendingIntents: 0,
        failedWebhooks: 0,
        receivedWebhooks: 0,
        reconciliationAlerts: 0,
      } satisfies PaymentOpsSummary,
      reconciliationRows: [] as Array<{ order: Order; intent?: PaymentIntent }>,
      intents: [] as PaymentIntent[],
      webhooks: [] as WebhookInboxRecord[],
      events: [] as PaymentEventRecord[],
    };
  }

  const [intents, webhooks, events] = await Promise.all([
    listPaymentIntents(),
    listWebhookInbox(),
    listPaymentEvents(),
  ]);

  const intentByReference = new Map(intents.map(intent => [intent.orderReference, intent]));
  const reconciliationRows = orders
    .map(order => ({ order, intent: intentByReference.get(order.id) }))
    .filter(row => hasReconciliationAlert(row.order, row.intent))
    .slice(0, 20);

  const summary: PaymentOpsSummary = {
    totalIntents: intents.length,
    paidIntents: intents.filter(intent => intent.status === "paid").length,
    failedIntents: intents.filter(intent => ["failed", "cancelled"].includes(intent.status)).length,
    processingIntents: intents.filter(intent => intent.status === "processing").length,
    pendingIntents: intents.filter(intent => ["created", "submitted", "pending_confirmation"].includes(intent.status)).length,
    failedWebhooks: webhooks.filter(webhook => webhook.status === "failed").length,
    receivedWebhooks: webhooks.length,
    reconciliationAlerts: reconciliationRows.length,
  };

  return { summary, reconciliationRows, intents, webhooks, events };
}
