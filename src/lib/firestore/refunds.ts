"use server";

import { requireStaffPermission } from "../auth";
import { getDb, isFirebaseConfigured } from "../firebase-admin";
import { createAuditLog, type AuditActor } from "./audit";
import type { RefundCase } from "./orders";

export type RefundExecutionStatus =
  | "queued"
  | "submitted"
  | "manual_review"
  | "failed"
  | "completed";

export type RefundExecutionRecord = {
  id: string;
  refundCaseId: string;
  orderReference: string;
  customerEmail: string;
  amount: number;
  amountUsd?: number;
  currencyCode?: string;
  provider: "smile-pay" | "manual";
  status: RefundExecutionStatus;
  attempts: number;
  providerReference?: string;
  providerResponse?: Record<string, unknown>;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

function buildRefundExecutionId(refundCaseId: string) {
  return `refund_exec_${refundCaseId}`;
}

function deriveRefundExecutionProvider(refund: RefundCase) {
  return refund.gatewayReference ? "smile-pay" : "manual";
}

async function requireAdminSession() {
  return requireStaffPermission("refunds.view");
}

const OPERATIONS_ACTOR: AuditActor = {
  role: "system",
  id: "ops:maintenance",
  label: "Operations Runner",
};

async function updateRefundExecutionStatusInternal(input: {
  refundCaseId: string;
  status: RefundExecutionStatus;
  providerReference?: string;
  providerResponse?: Record<string, unknown>;
  lastError?: string;
}, actor?: AuditActor) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const db = getDb();
  const executionId = buildRefundExecutionId(input.refundCaseId);
  const refundRef = db.collection("refund_cases").doc(input.refundCaseId);
  const executionRef = db.collection("refund_executions").doc(executionId);

  const [refundDoc, executionDoc] = await Promise.all([refundRef.get(), executionRef.get()]);
  if (!refundDoc.exists) {
    throw new Error("Refund case not found");
  }

  const refund = { id: refundDoc.id, ...refundDoc.data() } as RefundCase;
  const existing = executionDoc.exists ? ({ id: executionDoc.id, ...executionDoc.data() } as RefundExecutionRecord) : null;
  const timestamp = new Date().toISOString();
  const attempts = existing ? existing.attempts + 1 : 1;

  await executionRef.set(
    {
      refundCaseId: input.refundCaseId,
      orderReference: refund.orderReference,
      customerEmail: refund.customerEmail,
      amount: refund.amount,
      amountUsd: refund.amountUsd,
      currencyCode: refund.currencyCode,
      provider: existing?.provider ?? "smile-pay",
      status: input.status,
      attempts,
      providerReference: input.providerReference ?? existing?.providerReference,
      providerResponse: input.providerResponse ?? existing?.providerResponse,
      lastError: input.lastError ?? (input.status === "completed" ? null : existing?.lastError),
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      completedAt: input.status === "completed" ? timestamp : existing?.completedAt ?? null,
    },
    { merge: true },
  );

  if (input.status === "completed") {
    const notes = Array.isArray(refund.notes) ? [...refund.notes] : [];
    notes.push(`${timestamp}: Refund execution completed${input.providerReference ? ` (${input.providerReference})` : ""}.`);
    await refundRef.set(
      {
        status: "refunded",
        updatedAt: timestamp,
        resolvedAt: timestamp,
        notes,
      },
      { merge: true },
    );

    const { queueNotification } = await import("./notifications");
    await queueNotification({
      eventKey: `refund:${input.refundCaseId}:refunded`,
      type: "refund_status_updated",
      audience: "customer",
      customerEmail: refund.customerEmail,
      customerName: refund.customerName,
      orderReference: refund.orderReference,
      refundCaseId: input.refundCaseId,
      channels: ["email", "in_app"],
      subject: `Refund completed for order ${refund.orderReference}`,
      body: "Your refund has been completed successfully.",
      meta: {
        refundCaseId: input.refundCaseId,
        status: "refunded",
        providerReference: input.providerReference,
      },
    });

    const { upsertPaymentIntent } = await import("./payments");
    await upsertPaymentIntent({
      orderReference: refund.orderReference,
      provider: "smile-pay",
      paymentMethod: refund.paymentMethod ?? "UNKNOWN",
      status: "refunded",
      gatewayReference: input.providerReference,
      responsePayload: input.providerResponse,
    });
  }

  await createAuditLog({
    action: "refund_execution_updated",
    targetType: "refund_execution",
    targetId: executionId,
    detail: `Refund execution moved to ${input.status}.`,
    meta: {
      refundCaseId: input.refundCaseId,
      status: input.status,
      providerReference: input.providerReference,
      lastError: input.lastError,
    },
    actor,
  });

  return getRefundExecution(input.refundCaseId);
}

async function processRefundExecutionInternal(refundCaseId: string, actor?: AuditActor) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const db = getDb();
  const refundDoc = await db.collection("refund_cases").doc(refundCaseId).get();
  if (!refundDoc.exists) {
    throw new Error("Refund case not found");
  }

  const refund = { id: refundDoc.id, ...refundDoc.data() } as RefundCase;
  const execution = await ensureRefundExecutionForCaseInternal(refundCaseId, actor);
  if (!execution) {
    throw new Error("Unable to create refund execution record.");
  }

  if (execution.status === "completed") {
    return execution;
  }

  if (deriveRefundExecutionProvider(refund) !== "smile-pay" || !refund.gatewayReference) {
    return updateRefundExecutionStatusInternal({
      refundCaseId,
      status: "manual_review",
      lastError: "This refund does not have a gateway reference for automated execution. Complete it manually and then mark it completed.",
    }, actor);
  }

  return updateRefundExecutionStatusInternal({
    refundCaseId,
    status: "manual_review",
    lastError: "Automated Smile Pay refund execution is not configured in this environment yet. Complete the refund in the provider or finance channel, then record the result here.",
  }, actor);
}

export async function getRefundExecution(refundCaseId: string): Promise<RefundExecutionRecord | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const doc = await getDb().collection("refund_executions").doc(buildRefundExecutionId(refundCaseId)).get();
  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() } as RefundExecutionRecord;
}

export async function listRefundExecutions(): Promise<RefundExecutionRecord[]> {
  await requireAdminSession();

  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDb().collection("refund_executions").orderBy("updatedAt", "desc").limit(200).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as RefundExecutionRecord);
}

async function ensureRefundExecutionForCaseInternal(refundCaseId: string, actor?: AuditActor) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const db = getDb();
  const refundDoc = await db.collection("refund_cases").doc(refundCaseId).get();
  if (!refundDoc.exists) {
    throw new Error("Refund case not found");
  }

  const refund = { id: refundDoc.id, ...refundDoc.data() } as RefundCase & { provider?: string };
  const existing = await getRefundExecution(refundCaseId);
  if (existing) {
    return existing;
  }

  const timestamp = new Date().toISOString();
  const record: Omit<RefundExecutionRecord, "id"> = {
    refundCaseId,
    orderReference: refund.orderReference,
    customerEmail: refund.customerEmail,
    amount: refund.amount,
    amountUsd: refund.amountUsd,
    currencyCode: refund.currencyCode,
    provider: deriveRefundExecutionProvider(refund),
    status: "queued",
    attempts: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const id = buildRefundExecutionId(refundCaseId);
  await db.collection("refund_executions").doc(id).set(record, { merge: true });

  await createAuditLog({
    action: "refund_execution_updated",
    targetType: "refund_execution",
    targetId: id,
    detail: `Refund execution queued for case ${refundCaseId}.`,
    meta: {
      refundCaseId,
      orderReference: refund.orderReference,
      status: "queued",
    },
    actor,
  });

  return getRefundExecution(refundCaseId);
}

export async function ensureRefundExecutionForCase(refundCaseId: string) {
  await requireStaffPermission("refunds.manage");
  return ensureRefundExecutionForCaseInternal(refundCaseId);
}

export async function processRefundExecution(refundCaseId: string) {
  await requireStaffPermission("refunds.manage");
  return processRefundExecutionInternal(refundCaseId);
}

export async function updateRefundExecutionStatus(input: {
  refundCaseId: string;
  status: RefundExecutionStatus;
  providerReference?: string;
  providerResponse?: Record<string, unknown>;
  lastError?: string;
}) {
  await requireStaffPermission("refunds.execute");
  return updateRefundExecutionStatusInternal(input);
}

export async function processQueuedRefundExecutions(limit = 25) {
  if (!isFirebaseConfigured()) {
    return { attempted: 0, manualReview: 0, completed: 0, failed: 0 };
  }

  const snapshot = await getDb()
    .collection("refund_executions")
    .where("status", "==", "queued")
    .limit(limit)
    .get();

  let manualReview = 0;
  let completed = 0;
  let failed = 0;

  for (const doc of snapshot.docs) {
    const record = { id: doc.id, ...doc.data() } as RefundExecutionRecord;
    try {
      const result = await processRefundExecutionInternal(record.refundCaseId, OPERATIONS_ACTOR);
      if (result?.status === "completed") {
        completed += 1;
      } else {
        manualReview += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return {
    attempted: snapshot.size,
    manualReview,
    completed,
    failed,
  };
}

export async function getRefundOpsSummary() {
  await requireAdminSession();

  const executions = await listRefundExecutions();
  const now = Date.now();
  const queuedAgeLimitMs = 24 * 60 * 60 * 1000;
  const manualReviewAgeLimitMs = 12 * 60 * 60 * 1000;

  return {
    total: executions.length,
    queued: executions.filter(item => item.status === "queued").length,
    submitted: executions.filter(item => item.status === "submitted").length,
    manualReview: executions.filter(item => item.status === "manual_review").length,
    failed: executions.filter(item => item.status === "failed").length,
    completed: executions.filter(item => item.status === "completed").length,
    agedQueued: executions.filter(item => item.status === "queued" && now - new Date(item.updatedAt).getTime() > queuedAgeLimitMs).length,
    agedManualReview: executions.filter(item => item.status === "manual_review" && now - new Date(item.updatedAt).getTime() > manualReviewAgeLimitMs).length,
    executions,
  };
}
