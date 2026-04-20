import { getCurrencyMeta, type CurrencyCode } from "@/lib/currency";
import type { DigitalOrderStatus } from "@/lib/firestore/digital-orders";
import type { Order, RefundCase } from "@/lib/firestore/orders";
import { isSuccessfulGatewayStatus } from "./payment-flow";

export type OrderDocumentKind = "invoice" | "receipt" | "report";
export type OrderLifecycle = "in_progress" | "completed" | "issue";

function getPaymentMeta(order: Order) {
  return order.paymentMeta && typeof order.paymentMeta === "object"
    ? order.paymentMeta as Record<string, unknown>
    : {};
}

function getCurrencyCode(order: Order): CurrencyCode {
  return order.currencyCode === "924" ? "924" : "840";
}

export function formatDocumentDateTime(value?: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-ZW", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getOrderLifecycleState(input: {
  order: Order;
  refunds?: RefundCase[];
  digitalProvisioningStatus?: DigitalOrderStatus;
}) {
  const { order, refunds = [], digitalProvisioningStatus } = input;
  const paymentMeta = getPaymentMeta(order);
  const hasSuccessfulPaymentEvidence = isSuccessfulGatewayStatus(
    typeof paymentMeta.lastGatewayStatus === "string" ? paymentMeta.lastGatewayStatus : undefined,
  );
  const hasDigitalCompletionEvidence = digitalProvisioningStatus === "completed"
    || typeof paymentMeta.token === "string"
    || typeof paymentMeta.receiptNumber === "string"
    || typeof paymentMeta.vendedAt === "string";
  const isCompleted = order.status === "delivered"
    || order.shipping?.status === "delivered"
    || order.shipping?.status === "collected"
    || hasSuccessfulPaymentEvidence
    || hasDigitalCompletionEvidence;
  const hasIssue = order.status === "cancelled"
    || refunds.length > 0
    || digitalProvisioningStatus === "failed"
    || digitalProvisioningStatus === "manual_review";

  if (isCompleted) {
    return "completed" as const;
  }

  if (hasIssue) {
    return "issue" as const;
  }

  return "in_progress" as const;
}

export function getOrderDocumentState(input: {
  order: Order;
  refunds?: RefundCase[];
  digitalProvisioningStatus?: DigitalOrderStatus;
}) {
  const { order } = input;
  const lifecycle = getOrderLifecycleState(input);
  const paymentMeta = getPaymentMeta(order);
  const currencyCode = getCurrencyCode(order);
  const currency = getCurrencyMeta(currencyCode);

  if (lifecycle === "completed") {
    return {
      lifecycle,
      kind: "receipt" as const,
      documentLabel: "Receipt",
      statusLabel: "Completed",
      issuedAt:
        (typeof paymentMeta.vendedAt === "string" && paymentMeta.vendedAt)
        || (isSuccessfulGatewayStatus(typeof paymentMeta.lastGatewayStatus === "string" ? paymentMeta.lastGatewayStatus : undefined) ? order.updatedAt : undefined)
        || (order.shipping?.status === "delivered" || order.shipping?.status === "collected" ? order.shipping.updatedAt : undefined)
        || order.updatedAt
        || order.createdAt,
      currencyCode,
      currencyLabel: currency.label,
    };
  }

  if (lifecycle === "issue") {
    return {
      lifecycle,
      kind: "report" as const,
      documentLabel: "Issue Report",
      statusLabel: "Issue Requires Attention",
      issuedAt: order.updatedAt || order.createdAt,
      currencyCode,
      currencyLabel: currency.label,
    };
  }

  return {
    lifecycle,
    kind: "invoice" as const,
    documentLabel: "Invoice",
    statusLabel: "In Progress",
    issuedAt: order.createdAt,
    currencyCode,
    currencyLabel: currency.label,
  };
}
