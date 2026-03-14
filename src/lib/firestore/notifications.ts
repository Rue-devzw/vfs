"use server";

import crypto from "crypto";
import { requireStaffPermission } from "../auth";
import { getDb, isFirebaseConfigured } from "../firebase-admin";
import { isEmailConfigured, sendEmail } from "../email";
import { createAuditLog } from "./audit";

export type NotificationChannel = "email" | "sms" | "whatsapp" | "in_app";
export type NotificationStatus = "queued" | "sent" | "failed" | "cancelled";
export type NotificationAudience = "customer" | "admin";
export type NotificationType =
  | "order_pending"
  | "payment_processing"
  | "payment_failed"
  | "payment_cancelled"
  | "digital_fulfilment_completed"
  | "digital_fulfilment_issue"
  | "order_shipped"
  | "order_delivered"
  | "refund_requested"
  | "refund_status_updated"
  | "payment_ops_alert";

export type NotificationRecord = {
  id: string;
  eventKey: string;
  type: NotificationType;
  audience: NotificationAudience;
  customerEmail?: string;
  customerName?: string;
  orderReference?: string;
  refundCaseId?: string;
  channels: NotificationChannel[];
  status: NotificationStatus;
  subject: string;
  body: string;
  meta?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  error?: string;
};

export type NotificationOpsSummary = {
  total: number;
  queued: number;
  sent: number;
  failed: number;
  customerNotifications: number;
  adminNotifications: number;
};

function buildNotificationId(eventKey: string) {
  return `ntf_${crypto.createHash("sha256").update(eventKey).digest("hex")}`;
}

function normalizeChannels(channels: NotificationChannel[] | undefined) {
  const values = channels?.length ? channels : ["email"];
  return Array.from(new Set(values)) as NotificationChannel[];
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

export async function deliverNotification(id: string) {
  if (!isFirebaseConfigured()) {
    return { delivered: false, reason: "firebase_not_configured" as const };
  }

  const db = getDb();
  const doc = await db.collection("notifications").doc(id).get();
  if (!doc.exists) {
    throw new Error("Notification not found.");
  }

  const notification = { id: doc.id, ...doc.data() } as NotificationRecord;
  if (notification.status === "sent") {
    return { delivered: true, reason: "already_sent" as const };
  }

  if (!notification.channels.includes("email")) {
    return { delivered: false, reason: "no_email_channel" as const };
  }

  if (!notification.customerEmail) {
    await markNotificationStatus(notification.id, "failed", "Missing customer email.");
    return { delivered: false, reason: "missing_customer_email" as const };
  }

  if (!isEmailConfigured()) {
    return { delivered: false, reason: "smtp_not_configured" as const };
  }

  try {
    await sendEmail({
      to: notification.customerEmail,
      subject: notification.subject,
      text: notification.body,
    });
    await markNotificationStatus(notification.id, "sent");
    return { delivered: true, reason: "sent" as const };
  } catch (error) {
    await markNotificationStatus(
      notification.id,
      "failed",
      error instanceof Error ? error.message : "Email delivery failed.",
    );
    return { delivered: false, reason: "send_failed" as const };
  }
}

export async function processQueuedNotifications(limit = 25) {
  if (!isFirebaseConfigured()) {
    return { attempted: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const snapshot = await getDb()
    .collection("notifications")
    .where("status", "==", "queued")
    .limit(limit)
    .get();

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const result = await deliverNotification(doc.id);
    if (result.reason === "sent" || result.reason === "already_sent") {
      sent += 1;
    } else if (result.reason === "send_failed" || result.reason === "missing_customer_email") {
      failed += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    attempted: snapshot.size,
    sent,
    failed,
    skipped,
  };
}

export async function queueNotification(input: {
  eventKey: string;
  type: NotificationType;
  audience?: NotificationAudience;
  customerEmail?: string;
  customerName?: string;
  orderReference?: string;
  refundCaseId?: string;
  channels?: NotificationChannel[];
  subject: string;
  body: string;
  meta?: Record<string, unknown>;
}) {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const db = getDb();
  const id = buildNotificationId(input.eventKey);
  const ref = db.collection("notifications").doc(id);
  const existing = await ref.get();
  const timestamp = new Date().toISOString();

  if (existing.exists) {
    return { id, alreadyQueued: true };
  }

  await ref.set(stripUndefined({
    eventKey: input.eventKey,
    type: input.type,
    audience: input.audience ?? "customer",
    customerEmail: input.customerEmail?.toLowerCase(),
    customerName: input.customerName,
    orderReference: input.orderReference,
    refundCaseId: input.refundCaseId,
    channels: normalizeChannels(input.channels),
    status: "queued" satisfies NotificationStatus,
    subject: input.subject,
    body: input.body,
    meta: input.meta ?? {},
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies Omit<NotificationRecord, "id">));

  if (isEmailConfigured() && normalizeChannels(input.channels).includes("email")) {
    await deliverNotification(id);
  }

  return { id, alreadyQueued: false };
}

export async function markNotificationStatus(
  id: string,
  status: Exclude<NotificationStatus, "queued">,
  error?: string,
) {
  if (!isFirebaseConfigured()) {
    return;
  }

  await getDb().collection("notifications").doc(id).set(
    stripUndefined({
      status,
      error,
      updatedAt: new Date().toISOString(),
      sentAt: status === "sent" ? new Date().toISOString() : null,
    }),
    { merge: true },
  );
}

export async function retryNotification(id: string) {
  await requireStaffPermission("notifications.manage");
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  await getDb().collection("notifications").doc(id).set(
    {
      status: "queued" satisfies NotificationStatus,
      error: null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  const result = await deliverNotification(id);
  await createAuditLog({
    action: "notification_retried",
    targetType: "notification",
    targetId: id,
    detail: `Notification retry requested. Result: ${result.reason}.`,
    meta: result,
  });
  return result;
}

export async function resendNotification(id: string) {
  await requireStaffPermission("notifications.manage");
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  await getDb().collection("notifications").doc(id).set(
    {
      status: "queued" satisfies NotificationStatus,
      error: null,
      sentAt: null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  const result = await deliverNotification(id);
  await createAuditLog({
    action: "notification_resent",
    targetType: "notification",
    targetId: id,
    detail: `Notification resend requested. Result: ${result.reason}.`,
    meta: result,
  });
  return result;
}

async function requireAdminSession() {
  return requireStaffPermission("notifications.view");
}

export async function listNotifications(limit = 100): Promise<NotificationRecord[]> {
  await requireAdminSession();
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDb().collection("notifications").orderBy("createdAt", "desc").limit(limit).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as NotificationRecord);
}

export async function getNotificationOpsSummary() {
  await requireAdminSession();
  const notifications = await listNotifications();

  const summary: NotificationOpsSummary = {
    total: notifications.length,
    queued: notifications.filter(item => item.status === "queued").length,
    sent: notifications.filter(item => item.status === "sent").length,
    failed: notifications.filter(item => item.status === "failed").length,
    customerNotifications: notifications.filter(item => item.audience === "customer").length,
    adminNotifications: notifications.filter(item => item.audience === "admin").length,
  };

  return {
    summary,
    notifications,
  };
}
