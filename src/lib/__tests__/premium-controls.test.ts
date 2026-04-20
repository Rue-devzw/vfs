import { describe, expect, it } from "vitest";
import { buildReconciliationExceptions, validateShipmentTransitionRules } from "@/lib/premium-controls";

describe("validateShipmentTransitionRules", () => {
  it("blocks delivery dispatch without a courier", () => {
    const result = validateShipmentTransitionRules({
      deliveryMethod: "delivery",
      nextStatus: "out_for_delivery",
    });

    expect(result.allowed).toBe(false);
  });

  it("blocks delivery completion without proof", () => {
    const result = validateShipmentTransitionRules({
      deliveryMethod: "delivery",
      nextStatus: "delivered",
      courierName: "Rider One",
    });

    expect(result.allowed).toBe(false);
  });
});

describe("buildReconciliationExceptions", () => {
  it("builds premium control exceptions across payment, dispatch, digital, refund, and inventory", () => {
    const rows = buildReconciliationExceptions({
      now: Date.parse("2026-04-18T10:00:00.000Z"),
      orders: [
        {
          id: "order_1",
          items: [],
          total: 100,
          totalUsd: 100,
          customerName: "Ada",
          customerEmail: "ada@example.com",
          status: "processing",
          createdAt: "2026-04-18T05:00:00.000Z",
          updatedAt: "2026-04-18T05:30:00.000Z",
        },
      ],
      paymentRows: [
        {
          order: {
            id: "order_1",
            items: [],
            total: 100,
            totalUsd: 100,
            customerName: "Ada",
            customerEmail: "ada@example.com",
            status: "processing",
            createdAt: "2026-04-18T05:00:00.000Z",
            updatedAt: "2026-04-18T05:30:00.000Z",
          },
          intent: {
            id: "pi_1",
            orderReference: "order_1",
            provider: "smile-pay",
            paymentMethod: "CARD",
            amount: 100,
            status: "failed",
            createdAt: "2026-04-18T05:00:00.000Z",
            updatedAt: "2026-04-18T05:10:00.000Z",
          },
        },
      ],
      shipments: [
        {
          id: "shipment_1",
          orderReference: "order_1",
          deliveryMethod: "delivery",
          status: "ready_for_dispatch",
          createdAt: "2026-04-18T05:00:00.000Z",
          updatedAt: "2026-04-18T05:20:00.000Z",
        },
        {
          id: "shipment_2",
          orderReference: "order_1",
          deliveryMethod: "delivery",
          status: "delivered",
          courierName: "Rider One",
          createdAt: "2026-04-18T05:00:00.000Z",
          updatedAt: "2026-04-18T05:40:00.000Z",
        },
      ],
      refundExecutions: [
        {
          id: "refund_exec_1",
          refundCaseId: "refund_1",
          orderReference: "order_1",
          customerEmail: "ada@example.com",
          amount: 100,
          provider: "smile-pay",
          status: "manual_review",
          attempts: 1,
          createdAt: "2026-04-17T22:00:00.000Z",
          updatedAt: "2026-04-17T22:00:00.000Z",
        },
      ],
      digitalOrders: [
        {
          id: "digital_order_1",
          orderReference: "order_2",
          serviceId: "zesa",
          provider: "egress",
          accountReference: "123",
          customerEmail: "ada@example.com",
          provisioningStatus: "manual_review",
          createdAt: "2026-04-18T07:00:00.000Z",
          updatedAt: "2026-04-18T07:00:00.000Z",
        },
      ],
      inventoryRecords: new Map([
        ["SKU-1", {
          sku: "SKU-1",
          inventoryManaged: true,
          availableForSale: true,
          stockOnHand: 2,
          reservedQuantity: 4,
          allowBackorder: false,
          updatedAt: "2026-04-18T06:00:00.000Z",
        }],
      ]),
      inventoryMovements: [
        {
          id: "move_1",
          sku: "SKU-1",
          movementType: "count_variance",
          quantityDeltaOnHand: -6,
          quantityDeltaReserved: 0,
          createdAt: "2026-04-18T09:00:00.000Z",
        },
      ],
    });

    expect(rows.some(row => row.type === "payment")).toBe(true);
    expect(rows.some(row => row.type === "dispatch")).toBe(true);
    expect(rows.some(row => row.type === "proof_of_delivery")).toBe(true);
    expect(rows.some(row => row.type === "refund")).toBe(true);
    expect(rows.some(row => row.type === "digital")).toBe(true);
    expect(rows.filter(row => row.type === "inventory").length).toBeGreaterThanOrEqual(2);
  });
});
