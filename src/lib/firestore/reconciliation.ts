"use server";

import { requireStaffPermission, verifyAdminSession } from "../auth";
import { getDb, isFirebaseConfigured } from "../firebase-admin";
import { createAuditLog } from "./audit";
import { listDigitalOrders } from "./digital-orders";
import { listInventoryMovements, listInventoryRecords, recordInventoryCountVariance } from "./inventory";
import { listOrders } from "./orders";
import { getPaymentOpsSummary } from "./payments";
import { getRefundOpsSummary } from "./refunds";
import { listShipments } from "./shipments";
import {
  buildCsv,
  buildReconciliationBatchSummary,
  buildReconciliationExceptions,
  type ReconciliationExceptionAssignment,
  type ReconciliationExceptionType,
} from "../premium-controls";

export type ReconciliationBatchStatus = "open" | "reconciled" | "locked";

export type ReconciliationBatchSummary = ReturnType<typeof buildReconciliationBatchSummary>;

export type ReconciliationBatchRecord = {
  id: string;
  businessDate: string;
  status: ReconciliationBatchStatus;
  summary: ReconciliationBatchSummary;
  ownerId?: string;
  ownerLabel?: string;
  ownerEmail?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  reconciledAt?: string;
  lockedAt?: string;
};

export type ReconciliationExceptionAssignmentRecord = {
  id: string;
  type: ReconciliationExceptionType;
  reference: string;
  ownerId: string;
  ownerLabel: string;
  ownerEmail?: string;
  note?: string;
  status: "open" | "resolved";
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
};

function buildBatchId(businessDate: string) {
  return `recon_${businessDate}`;
}

function buildAssignmentId(type: ReconciliationExceptionType, reference: string) {
  return `ops_exception_${type}_${reference.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 96)}`;
}

function sanitizeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value
      .map(entry => sanitizeValue(entry))
      .filter(entry => entry !== undefined);
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

async function requireReconciliationViewer() {
  return requireStaffPermission("dashboard.view");
}

async function requireReconciliationManager() {
  return requireStaffPermission("settings.manage");
}

async function requireExceptionManager() {
  return requireStaffPermission("orders.edit");
}

export async function listReconciliationAssignments(): Promise<ReconciliationExceptionAssignmentRecord[]> {
  await requireReconciliationViewer();
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDb()
    .collection("reconciliation_exception_assignments")
    .orderBy("updatedAt", "desc")
    .limit(250)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ReconciliationExceptionAssignmentRecord);
}

export async function claimReconciliationException(input: {
  type: ReconciliationExceptionType;
  reference: string;
  note?: string;
}) {
  const session = await requireExceptionManager();
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const db = getDb();
  const timestamp = new Date().toISOString();
  const id = buildAssignmentId(input.type, input.reference);
  const ref = db.collection("reconciliation_exception_assignments").doc(id);
  const existing = await ref.get();

  await ref.set(stripUndefined({
    type: input.type,
    reference: input.reference,
    ownerId: session.staffId,
    ownerLabel: session.staffLabel,
    ownerEmail: session.staffEmail,
    note: input.note?.trim() || undefined,
    status: "open",
    createdAt: existing.exists ? (existing.data()?.createdAt ?? timestamp) : timestamp,
    updatedAt: timestamp,
    resolvedAt: null,
  }), { merge: true });

  await createAuditLog({
    action: "reconciliation_exception_assigned",
    targetType: "reconciliation_exception",
    targetId: id,
    detail: `Exception ${input.type}:${input.reference} assigned to ${session.staffLabel}.`,
    meta: {
      type: input.type,
      reference: input.reference,
      note: input.note?.trim() || undefined,
    },
  });
}

export async function resolveReconciliationException(input: {
  type: ReconciliationExceptionType;
  reference: string;
  note?: string;
}) {
  await requireExceptionManager();
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const timestamp = new Date().toISOString();
  const id = buildAssignmentId(input.type, input.reference);
  await getDb().collection("reconciliation_exception_assignments").doc(id).set(stripUndefined({
    type: input.type,
    reference: input.reference,
    status: "resolved",
    note: input.note?.trim() || undefined,
    updatedAt: timestamp,
    resolvedAt: timestamp,
  }), { merge: true });

  await createAuditLog({
    action: "reconciliation_exception_assigned",
    targetType: "reconciliation_exception",
    targetId: id,
    detail: `Exception ${input.type}:${input.reference} marked resolved.`,
    meta: {
      type: input.type,
      reference: input.reference,
      note: input.note?.trim() || undefined,
      status: "resolved",
    },
  });
}

export async function listReconciliationBatches(limit = 30): Promise<ReconciliationBatchRecord[]> {
  await requireReconciliationViewer();
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDb()
    .collection("reconciliation_batches")
    .orderBy("businessDate", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ReconciliationBatchRecord);
}

export async function syncReconciliationBatch(businessDate: string) {
  await requireReconciliationManager();
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const workspace = await getReconciliationWorkspace();
  const session = await verifyAdminSession();
  const timestamp = new Date().toISOString();
  const id = buildBatchId(businessDate);
  const ref = getDb().collection("reconciliation_batches").doc(id);
  const existing = await ref.get();
  const current = existing.exists ? (existing.data() as Partial<ReconciliationBatchRecord>) : null;

  await ref.set(stripUndefined({
    businessDate,
    status: current?.status ?? "open",
    summary: workspace.summary,
    ownerId: current?.ownerId ?? session?.staffId,
    ownerLabel: current?.ownerLabel ?? session?.staffLabel,
    ownerEmail: current?.ownerEmail ?? session?.staffEmail,
    notes: current?.notes,
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
    reconciledAt: current?.reconciledAt ?? null,
    lockedAt: current?.lockedAt ?? null,
  }), { merge: true });

  await createAuditLog({
    action: "reconciliation_batch_updated",
    targetType: "reconciliation_batch",
    targetId: id,
    detail: `Reconciliation batch ${businessDate} synchronized with live controls.`,
    meta: {
      businessDate,
      status: current?.status ?? "open",
      totalExceptions: workspace.summary.totalExceptions,
    },
  });

  return ({ id, ...(await ref.get()).data() } as ReconciliationBatchRecord);
}

export async function updateReconciliationBatch(input: {
  businessDate: string;
  status: ReconciliationBatchStatus;
  notes?: string;
}) {
  await requireReconciliationManager();
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const id = buildBatchId(input.businessDate);
  const ref = getDb().collection("reconciliation_batches").doc(id);
  const existing = await ref.get();
  if (!existing.exists) {
    await syncReconciliationBatch(input.businessDate);
  }

  const snapshot = await ref.get();
  const current = snapshot.data() as Partial<ReconciliationBatchRecord> | undefined;
  const timestamp = new Date().toISOString();

  if (current?.status === "locked" && input.status !== "locked") {
    throw new Error("Locked reconciliation batches cannot be reopened.");
  }
  if (current?.status === "open" && input.status === "locked") {
    throw new Error("Mark the batch reconciled before locking it.");
  }

  await ref.set(stripUndefined({
    status: input.status,
    notes: input.notes?.trim() || current?.notes || undefined,
    updatedAt: timestamp,
    reconciledAt: input.status === "reconciled" ? timestamp : current?.reconciledAt ?? null,
    lockedAt: input.status === "locked" ? timestamp : current?.lockedAt ?? null,
  }), { merge: true });

  await createAuditLog({
    action: "reconciliation_batch_updated",
    targetType: "reconciliation_batch",
    targetId: id,
    detail: `Reconciliation batch ${input.businessDate} moved to ${input.status}.`,
    meta: {
      businessDate: input.businessDate,
      status: input.status,
      notes: input.notes?.trim() || undefined,
    },
  });
}

export async function captureInventoryCountVariance(input: {
  sku: string;
  countedStockOnHand: number;
  note?: string;
}) {
  await requireExceptionManager();
  return recordInventoryCountVariance(input);
}

export async function getReconciliationWorkspace() {
  await requireReconciliationViewer();

  const [orders, shipments, refundOps, digitalOrders, assignments, inventoryRecords, inventoryMovements] = await Promise.all([
    listOrders(),
    listShipments(),
    getRefundOpsSummary(),
    listDigitalOrders(),
    listReconciliationAssignments(),
    listInventoryRecords(),
    listInventoryMovements(200),
  ]);

  const paymentOps = await getPaymentOpsSummary(orders);
  const exceptionRows = buildReconciliationExceptions({
    orders,
    paymentRows: paymentOps.reconciliationRows,
    shipments,
    refundExecutions: refundOps.executions,
    digitalOrders,
    inventoryRecords,
    inventoryMovements,
    assignments: assignments.map(assignment => ({
      type: assignment.type,
      reference: assignment.reference,
      ownerId: assignment.ownerId,
      ownerLabel: assignment.ownerLabel,
      ownerEmail: assignment.ownerEmail,
      status: assignment.status,
    }) satisfies ReconciliationExceptionAssignment),
  });

  const summary = buildReconciliationBatchSummary({
    orders,
    paymentRows: paymentOps.reconciliationRows,
    shipments,
    digitalOrders,
    refundExecutions: refundOps.executions,
    inventoryMovements,
    exceptionRows,
  });

  return {
    orders,
    shipments,
    paymentOps,
    refundOps,
    digitalOrders,
    assignments,
    inventoryRecords,
    inventoryMovements,
    exceptionRows,
    summary,
  };
}

export async function buildReconciliationExport(pack: "exceptions" | "batches" | "inventory_movements") {
  await requireReconciliationViewer();

  if (pack === "batches") {
    const batches = await listReconciliationBatches(60);
    return buildCsv(
      [
        "businessDate",
        "status",
        "ownerLabel",
        "totalSalesUsd",
        "collectedSalesUsd",
        "deliveredSalesUsd",
        "totalExceptions",
        "notes",
        "updatedAt",
      ],
      batches.map(batch => [
        batch.businessDate,
        batch.status,
        batch.ownerLabel ?? "",
        batch.summary.totalSalesUsd,
        batch.summary.collectedSalesUsd,
        batch.summary.deliveredSalesUsd,
        batch.summary.totalExceptions,
        batch.notes ?? "",
        batch.updatedAt,
      ]),
    );
  }

  if (pack === "inventory_movements") {
    const movements = await listInventoryMovements(300);
    return buildCsv(
      [
        "createdAt",
        "movementType",
        "sku",
        "orderReference",
        "quantityDeltaOnHand",
        "quantityDeltaReserved",
        "resultingStockOnHand",
        "resultingReservedQuantity",
        "reason",
        "actorLabel",
      ],
      movements.map(movement => [
        movement.createdAt,
        movement.movementType,
        movement.sku,
        movement.orderReference ?? "",
        movement.quantityDeltaOnHand,
        movement.quantityDeltaReserved,
        movement.resultingStockOnHand ?? "",
        movement.resultingReservedQuantity ?? "",
        movement.reason ?? "",
        movement.actorLabel ?? "",
      ]),
    );
  }

  const workspace = await getReconciliationWorkspace();
  return buildCsv(
    [
      "type",
      "reference",
      "summary",
      "detail",
      "severity",
      "ageHours",
      "ageBucket",
      "orderReference",
      "customerEmail",
      "ownerLabel",
      "ownerStatus",
      "detectedAt",
    ],
    workspace.exceptionRows.map(row => [
      row.type,
      row.reference,
      row.summary,
      row.detail,
      row.severity,
      row.ageHours,
      row.ageBucket,
      row.orderReference ?? "",
      row.customerEmail ?? "",
      row.ownerLabel ?? "",
      row.ownerStatus ?? "",
      row.detectedAt,
    ]),
  );
}
