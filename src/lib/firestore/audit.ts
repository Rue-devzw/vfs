"use server";

import crypto from "crypto";
import { requireStaffPermission, type StaffRole } from "../auth";
import { getDb, isFirebaseConfigured } from "../firebase-admin";

export type AuditAction =
  | "order_status_updated"
  | "order_shipping_updated"
  | "shipment_updated"
  | "refund_status_updated"
  | "refund_execution_updated"
  | "notification_retried"
  | "notification_resent"
  | "settings_updated"
  | "digital_reprocessed"
  | "digital_escalated"
  | "ops_maintenance_ran"
  | "reconciliation_batch_updated"
  | "reconciliation_exception_assigned"
  | "inventory_count_recorded";

export type AuditActor = {
  role: StaffRole | "system";
  id: string;
  label: string;
  email?: string;
};

export type AuditLogRecord = {
  id: string;
  actorRole: StaffRole | "system";
  actorId: string;
  actorLabel: string;
  actorEmail?: string;
  action: AuditAction;
  targetType:
    | "order"
    | "refund_case"
    | "refund_execution"
    | "notification"
    | "settings"
    | "digital_order"
    | "shipment"
    | "ops"
    | "reconciliation_batch"
    | "reconciliation_exception"
    | "inventory_count";
  targetId: string;
  detail: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

function buildAuditId(action: AuditAction, targetType: AuditLogRecord["targetType"], targetId: string, createdAt: string) {
  return `audit_${crypto.createHash("sha256").update(`${action}:${targetType}:${targetId}:${createdAt}`).digest("hex")}`;
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

async function requireAuditWriter() {
  return requireStaffPermission("dashboard.view");
}

export async function createAuditLog(input: {
  action: AuditAction;
  targetType: AuditLogRecord["targetType"];
  targetId: string;
  detail: string;
  meta?: Record<string, unknown>;
  actor?: AuditActor;
}) {
  const resolvedActor = input.actor ?? await requireAuditWriter().then(session => ({
    role: session.role,
    id: session.staffId,
    label: session.staffLabel,
    email: session.staffEmail,
  }));
  if (!resolvedActor) {
    throw new Error("Audit actor resolution failed.");
  }
  if (!isFirebaseConfigured()) {
    return null;
  }

  const db = getDb();
  const createdAt = new Date().toISOString();
  const id = buildAuditId(input.action, input.targetType, input.targetId, createdAt);

  await db.collection("audit_logs").doc(id).set(stripUndefined({
    actorRole: resolvedActor.role,
    actorId: resolvedActor.id,
    actorLabel: resolvedActor.label,
    actorEmail: resolvedActor.email,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    detail: input.detail,
    meta: input.meta ?? {},
    createdAt,
  } satisfies Omit<AuditLogRecord, "id">));

  return id;
}

export async function listAuditLogs(limit = 100): Promise<AuditLogRecord[]> {
  await requireStaffPermission("audit.view");
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDb().collection("audit_logs").orderBy("createdAt", "desc").limit(limit).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AuditLogRecord);
}
