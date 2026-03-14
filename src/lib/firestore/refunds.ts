"use server";

import { requireStaffPermission, requireStaffRoles } from "../auth";
import { getDb, isFirebaseConfigured } from "../firebase-admin";
import { createAuditLog } from "./audit";
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
  provider: "zb" | "manual";
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

async function requireAdminSession() {
  return requireStaffPermission("refunds.view");
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

export async function ensureRefundExecutionForCase(refundCaseId: string) {
  await requireStaffRoles(["admin"]);

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
    provider: "zb",
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
  });

  return getRefundExecution(refundCaseId);
}

export async function updateRefundExecutionStatus(input: {
  refundCaseId: string;
  status: RefundExecutionStatus;
  providerReference?: string;
  providerResponse?: Record<string, unknown>;
  lastError?: string;
}) {
  await requireStaffRoles(["admin"]);

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
      provider: existing?.provider ?? "zb",
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
      provider: "zb",
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
  });

  return getRefundExecution(input.refundCaseId);
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
