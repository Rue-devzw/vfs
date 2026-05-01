import type { DigitalOrderRecord } from "./firestore/digital-orders";
import type { InventoryMovementRecord, InventoryRecord } from "./firestore/inventory";
import type { Order } from "./firestore/orders";
import type { PaymentIntent } from "./firestore/payments";
import type { RefundExecutionRecord } from "./firestore/refunds";
import type { ShipmentRecord } from "./firestore/shipments";

export type ReconciliationExceptionType =
  | "payment"
  | "dispatch"
  | "proof_of_delivery"
  | "refund"
  | "digital"
  | "inventory";

export type ReconciliationExceptionSeverity = "medium" | "high" | "critical";
export type ReconciliationExceptionAgeBucket = "fresh" | "aging" | "breach";

export type ReconciliationExceptionRow = {
  type: ReconciliationExceptionType;
  reference: string;
  summary: string;
  detail: string;
  severity: ReconciliationExceptionSeverity;
  ageHours: number;
  ageBucket: ReconciliationExceptionAgeBucket;
  orderReference?: string;
  customerEmail?: string;
  ownerId?: string;
  ownerLabel?: string;
  ownerEmail?: string;
  ownerStatus?: "open" | "resolved";
  detectedAt: string;
};

export type ReconciliationExceptionAssignment = {
  type: ReconciliationExceptionType;
  reference: string;
  ownerId: string;
  ownerLabel: string;
  ownerEmail?: string;
  status: "open" | "resolved";
};

function hoursBetween(startedAt?: string, now = Date.now()) {
  if (!startedAt) return 0;
  const diff = now - Date.parse(startedAt);
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.max(Math.round(diff / (1000 * 60 * 60)), 0);
}

function toAgeBucket(ageHours: number, breachThresholdHours: number) {
  if (ageHours >= breachThresholdHours) return "breach";
  if (ageHours >= Math.max(Math.floor(breachThresholdHours / 2), 1)) return "aging";
  return "fresh";
}

function withAssignment(
  row: Omit<ReconciliationExceptionRow, "ownerId" | "ownerLabel" | "ownerEmail" | "ownerStatus">,
  assignments: Map<string, ReconciliationExceptionAssignment>,
): ReconciliationExceptionRow {
  const assignment = assignments.get(`${row.type}:${row.reference}`);
  return {
    ...row,
    ownerId: assignment?.ownerId,
    ownerLabel: assignment?.ownerLabel,
    ownerEmail: assignment?.ownerEmail,
    ownerStatus: assignment?.status,
  };
}

export function validateShipmentTransitionRules(input: {
  deliveryMethod: "collect" | "delivery";
  nextStatus:
    | "awaiting_payment"
    | "pickup_pending"
    | "ready_for_dispatch"
    | "out_for_delivery"
    | "delivered"
    | "collected"
    | "issue";
  courierName?: string;
  proofOfDeliveryUrl?: string;
}) {
  if (input.deliveryMethod !== "delivery") {
    return { allowed: true as const };
  }

  if (input.nextStatus === "out_for_delivery" && !input.courierName?.trim()) {
    return {
      allowed: false as const,
      reason: "Assign a courier before moving this delivery out for delivery.",
    };
  }

  if (input.nextStatus === "delivered" && !input.proofOfDeliveryUrl?.trim()) {
    return {
      allowed: false as const,
      reason: "Capture a proof-of-delivery URL before marking this delivery completed.",
    };
  }

  return { allowed: true as const };
}

export function buildReconciliationExceptions(input: {
  orders: Order[];
  paymentRows: Array<{ order: Order; intent?: PaymentIntent }>;
  shipments: ShipmentRecord[];
  refundExecutions: RefundExecutionRecord[];
  digitalOrders: DigitalOrderRecord[];
  inventoryRecords: Map<string, InventoryRecord>;
  inventoryMovements: InventoryMovementRecord[];
  assignments?: ReconciliationExceptionAssignment[];
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const assignments = new Map(
    (input.assignments ?? []).map(assignment => [`${assignment.type}:${assignment.reference}`, assignment]),
  );
  const rows: ReconciliationExceptionRow[] = [];
  const orderMap = new Map(input.orders.map(order => [order.id, order]));

  for (const row of input.paymentRows) {
    const ageHours = hoursBetween(row.order.updatedAt ?? row.order.createdAt, now);
    rows.push(
      withAssignment({
        type: "payment",
        reference: row.order.id,
        summary: "Order and payment states are out of sync",
        detail: row.intent
          ? `Order ${row.order.status} but payment intent is ${row.intent.status}.`
          : "Order has progressed without a tracked payment intent.",
        severity: row.order.status === "shipped" || row.order.status === "delivered" ? "critical" : "high",
        ageHours,
        ageBucket: toAgeBucket(ageHours, 8),
        orderReference: row.order.id,
        customerEmail: row.order.customerEmail,
        detectedAt: row.order.updatedAt ?? row.order.createdAt,
      }, assignments),
    );
  }

  for (const shipment of input.shipments) {
    const order = orderMap.get(shipment.orderReference);
    if (
      shipment.deliveryMethod === "delivery"
      && ["ready_for_dispatch", "out_for_delivery"].includes(shipment.status)
      && !shipment.courierName
    ) {
      const ageHours = hoursBetween(shipment.updatedAt, now);
      rows.push(
        withAssignment({
          type: "dispatch",
          reference: shipment.orderReference,
          summary: "Delivery shipment is missing a courier assignment",
          detail: `Shipment is ${shipment.status.replace(/_/g, " ")} but has no courier assigned.`,
          severity: shipment.status === "out_for_delivery" ? "critical" : "high",
          ageHours,
          ageBucket: toAgeBucket(ageHours, 6),
          orderReference: shipment.orderReference,
          customerEmail: order?.customerEmail,
          detectedAt: shipment.updatedAt,
        }, assignments),
      );
    }

    if (shipment.deliveryMethod === "delivery" && shipment.status === "delivered" && !shipment.proofOfDeliveryUrl) {
      const ageHours = hoursBetween(shipment.updatedAt, now);
      rows.push(
        withAssignment({
          type: "proof_of_delivery",
          reference: shipment.orderReference,
          summary: "Delivered shipment has no proof of delivery",
          detail: "Revenue should not be treated as fully completed until proof is captured.",
          severity: "critical",
          ageHours,
          ageBucket: toAgeBucket(ageHours, 4),
          orderReference: shipment.orderReference,
          customerEmail: order?.customerEmail,
          detectedAt: shipment.updatedAt,
        }, assignments),
      );
    }
  }

  for (const execution of input.refundExecutions) {
    if (!["queued", "manual_review", "failed"].includes(execution.status)) {
      continue;
    }

    const ageHours = hoursBetween(execution.updatedAt, now);
    rows.push(
      withAssignment({
        type: "refund",
        reference: execution.refundCaseId,
        summary: "Refund execution needs follow-through",
        detail: execution.lastError
          ? `${execution.status.replace(/_/g, " ")}: ${execution.lastError}`
          : `Refund execution is ${execution.status.replace(/_/g, " ")}.`,
        severity: execution.status === "failed" ? "critical" : execution.status === "manual_review" ? "high" : "medium",
        ageHours,
        ageBucket: toAgeBucket(ageHours, execution.status === "queued" ? 24 : 12),
        orderReference: execution.orderReference,
        customerEmail: execution.customerEmail,
        detectedAt: execution.updatedAt,
      }, assignments),
    );
  }

  for (const digital of input.digitalOrders) {
    if (!["pending", "processing", "failed"].includes(digital.provisioningStatus)) {
      continue;
    }

    const ageHours = hoursBetween(digital.updatedAt, now);
    rows.push(
      withAssignment({
        type: "digital",
        reference: digital.orderReference,
        summary: "Digital fulfilment requires intervention",
        detail: `Digital order is ${digital.provisioningStatus}.`,
        severity: digital.provisioningStatus === "failed" ? "critical" : "medium",
        ageHours,
        ageBucket: toAgeBucket(ageHours, 1),
        orderReference: digital.orderReference,
        customerEmail: digital.customerEmail ?? undefined,
        detectedAt: digital.updatedAt,
      }, assignments),
    );
  }

  for (const [sku, record] of input.inventoryRecords) {
    const available = record.stockOnHand - record.reservedQuantity;
    if (available < 0 && !record.allowBackorder) {
      const ageHours = hoursBetween(record.updatedAt, now);
      rows.push(
        withAssignment({
          type: "inventory",
          reference: sku,
          summary: "Inventory is over-reserved",
          detail: `${sku} has ${record.reservedQuantity} reserved against ${record.stockOnHand} on hand.`,
          severity: "high",
          ageHours,
          ageBucket: toAgeBucket(ageHours, 12),
          detectedAt: record.updatedAt ?? new Date(now).toISOString(),
        }, assignments),
      );
    }
  }

  for (const movement of input.inventoryMovements.filter(item => item.movementType === "count_variance")) {
    const ageHours = hoursBetween(movement.createdAt, now);
    rows.push(
      withAssignment({
        type: "inventory",
        reference: movement.id,
        summary: "Physical count variance recorded",
        detail: `${movement.sku} adjusted by ${movement.quantityDeltaOnHand > 0 ? "+" : ""}${movement.quantityDeltaOnHand} units. Review for shrinkage or receiving issues.`,
        severity: Math.abs(movement.quantityDeltaOnHand) >= 5 ? "high" : "medium",
        ageHours,
        ageBucket: toAgeBucket(ageHours, 24),
        detectedAt: movement.createdAt,
      }, assignments),
    );
  }

  return rows.sort((left, right) => {
    const severityOrder = { critical: 0, high: 1, medium: 2 };
    return severityOrder[left.severity] - severityOrder[right.severity] || right.ageHours - left.ageHours;
  });
}

export function buildReconciliationBatchSummary(input: {
  orders: Order[];
  paymentRows: Array<{ order: Order; intent?: PaymentIntent }>;
  shipments: ShipmentRecord[];
  digitalOrders: DigitalOrderRecord[];
  refundExecutions: RefundExecutionRecord[];
  inventoryMovements: InventoryMovementRecord[];
  exceptionRows: ReconciliationExceptionRow[];
}) {
  const paidOrders = input.orders.filter(order => order.status !== "pending" && order.status !== "cancelled");
  const deliveredOrders = input.orders.filter(order => order.status === "delivered");
  const digitalCompleted = input.digitalOrders.filter(order => order.provisioningStatus === "completed").length;
  const pendingDispatch = input.shipments.filter(shipment =>
    shipment.deliveryMethod === "delivery"
    && ["pickup_pending", "ready_for_dispatch"].includes(shipment.status),
  ).length;
  const openRefunds = input.refundExecutions.filter(item => item.status !== "completed").length;
  const countVariances = input.inventoryMovements.filter(item => item.movementType === "count_variance").length;

  return {
    totalSalesUsd: Number(
      input.orders.reduce((sum, order) => sum + (order.totalUsd ?? order.total ?? 0), 0).toFixed(2),
    ),
    collectedSalesUsd: Number(
      paidOrders.reduce((sum, order) => sum + (order.totalUsd ?? order.total ?? 0), 0).toFixed(2),
    ),
    deliveredSalesUsd: Number(
      deliveredOrders.reduce((sum, order) => sum + (order.totalUsd ?? order.total ?? 0), 0).toFixed(2),
    ),
    salesCount: input.orders.length,
    collectedCount: paidOrders.length,
    deliveredCount: deliveredOrders.length,
    paymentExceptions: input.paymentRows.length,
    dispatchExceptions: input.exceptionRows.filter(item => item.type === "dispatch").length,
    podExceptions: input.exceptionRows.filter(item => item.type === "proof_of_delivery").length,
    refundExceptions: openRefunds,
    digitalExceptions: input.exceptionRows.filter(item => item.type === "digital").length,
    digitalCompleted,
    pendingDispatch,
    inventoryVariances: countVariances,
    totalExceptions: input.exceptionRows.length,
  };
}

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(header: string[], rows: Array<Array<unknown>>) {
  return [header, ...rows].map(row => row.map(csvEscape).join(",")).join("\n");
}
