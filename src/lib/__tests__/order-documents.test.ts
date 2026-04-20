import { describe, expect, it } from "vitest";
import { getOrderDocumentState } from "@/lib/order-documents";
import type { Order } from "@/lib/firestore/orders";

function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order_123",
    items: [],
    total: 25,
    customerName: "Test Customer",
    customerEmail: "customer@example.com",
    status: "pending",
    currencyCode: "840",
    createdAt: "2026-04-16T10:00:00.000Z",
    updatedAt: "2026-04-16T10:05:00.000Z",
    ...overrides,
  };
}

describe("order documents", () => {
  it("shows a receipt for completed physical orders", () => {
    const order = buildOrder({
      status: "delivered",
      shipping: {
        deliveryMethod: "delivery",
        status: "delivered",
        updatedAt: "2026-04-16T12:00:00.000Z",
      },
    });

    const result = getOrderDocumentState({ order });

    expect(result.kind).toBe("receipt");
    expect(result.statusLabel).toBe("Completed");
    expect(result.issuedAt).toBe("2026-04-16T12:00:00.000Z");
  });

  it("shows an issue report for cancelled orders", () => {
    const order = buildOrder({
      status: "cancelled",
    });

    const result = getOrderDocumentState({ order });

    expect(result.kind).toBe("report");
    expect(result.statusLabel).toBe("Issue Requires Attention");
  });

  it("keeps pending orders on invoice-only state", () => {
    const order = buildOrder();

    const result = getOrderDocumentState({ order });

    expect(result.kind).toBe("invoice");
    expect(result.statusLabel).toBe("In Progress");
  });

  it("treats completed digital fulfilment as completed even if the order status is still processing", () => {
    const order = buildOrder({
      status: "processing",
      paymentMeta: {
        receiptNumber: "RCT-123",
        vendedAt: "2026-04-16T11:30:00.000Z",
      },
    });

    const result = getOrderDocumentState({
      order,
      digitalProvisioningStatus: "completed",
    });

    expect(result.kind).toBe("receipt");
    expect(result.statusLabel).toBe("Completed");
    expect(result.issuedAt).toBe("2026-04-16T11:30:00.000Z");
  });

  it("treats successful payment confirmation as receipt-ready even before delivery", () => {
    const order = buildOrder({
      status: "processing",
      updatedAt: "2026-04-16T10:20:00.000Z",
      paymentMeta: {
        lastGatewayStatus: "PAID",
      },
    });

    const result = getOrderDocumentState({ order });

    expect(result.kind).toBe("receipt");
    expect(result.statusLabel).toBe("Completed");
    expect(result.issuedAt).toBe("2026-04-16T10:20:00.000Z");
  });
});
