import { createAuditLog } from "./firestore/audit";
import { sweepStaleDigitalOrders } from "./firestore/digital-orders";
import { processQueuedNotifications } from "./firestore/notifications";
import { processQueuedRefundExecutions } from "./firestore/refunds";
import { releaseExpiredReservations } from "./firestore/inventory";

export type OperationsMaintenanceSummary = {
  notifications: Awaited<ReturnType<typeof processQueuedNotifications>>;
  reservations: Awaited<ReturnType<typeof releaseExpiredReservations>>;
  refunds: Awaited<ReturnType<typeof processQueuedRefundExecutions>>;
  digital: Awaited<ReturnType<typeof sweepStaleDigitalOrders>>;
  processedAt: string;
};

export async function runOperationsMaintenance(options?: {
  notificationLimit?: number;
  reservationLimit?: number;
  refundLimit?: number;
  digitalLimit?: number;
  digitalStaleMinutes?: number;
}) {
  const processedAt = new Date().toISOString();
  const notificationLimit = options?.notificationLimit ?? 100;
  const reservationLimit = options?.reservationLimit ?? 250;
  const refundLimit = options?.refundLimit ?? 50;
  const digitalLimit = options?.digitalLimit ?? 50;
  const digitalStaleMinutes = options?.digitalStaleMinutes ?? 30;

  const [notifications, reservations, refunds, digital] = await Promise.all([
    notificationLimit > 0 ? processQueuedNotifications(notificationLimit) : Promise.resolve({ attempted: 0, sent: 0, failed: 0, skipped: 0 }),
    reservationLimit > 0 ? releaseExpiredReservations(reservationLimit) : Promise.resolve({ updated: 0, orderReferences: [] }),
    refundLimit > 0 ? processQueuedRefundExecutions(refundLimit) : Promise.resolve({ attempted: 0, manualReview: 0, completed: 0, failed: 0 }),
    digitalLimit > 0 ? sweepStaleDigitalOrders(digitalLimit, digitalStaleMinutes) : Promise.resolve({ attempted: 0, escalated: 0 }),
  ]);

  const summary: OperationsMaintenanceSummary = {
    notifications,
    reservations,
    refunds,
    digital,
    processedAt,
  };

  await createAuditLog({
    action: "ops_maintenance_ran",
    targetType: "ops",
    targetId: `ops_${processedAt}`,
    detail: "Operations maintenance runner completed a queue and backlog sweep.",
    meta: summary,
    actor: {
      role: "system",
      id: "ops:maintenance",
      label: "Operations Runner",
    },
  });

  return summary;
}
