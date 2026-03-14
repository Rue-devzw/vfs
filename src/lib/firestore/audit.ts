"use server";

import crypto from "crypto";
import { requireStaffPermission } from "../auth";
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
  | "digital_reprocessed";

export type AuditLogRecord = {
  id: string;
  actorRole: "admin" | "store_manager" | "auditor";
  action: AuditAction;
  targetType: "order" | "refund_case" | "refund_execution" | "notification" | "settings" | "digital_order" | "shipment";
  targetId: string;
  detail: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

function buildAuditId(action: AuditAction, targetType: AuditLogRecord["targetType"], targetId: string, createdAt: string) {
  return `audit_${crypto.createHash("sha256").update(`${action}:${targetType}:${targetId}:${createdAt}`).digest("hex")}`;
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
}) {
  const session = await requireAuditWriter();
  if (!isFirebaseConfigured()) {
    return null;
  }

  const db = getDb();
  const createdAt = new Date().toISOString();
  const id = buildAuditId(input.action, input.targetType, input.targetId, createdAt);

  await db.collection("audit_logs").doc(id).set({
    actorRole: session.role,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    detail: input.detail,
    meta: input.meta ?? {},
    createdAt,
  } satisfies Omit<AuditLogRecord, "id">);

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
