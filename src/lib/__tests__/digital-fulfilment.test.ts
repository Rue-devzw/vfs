import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/lib/firestore/orders";

const vendDigitalFulfilment = vi.fn();
const getOrder = vi.fn();
const setOrderStatus = vi.fn();
const upsertDigitalOrder = vi.fn();
const queueNotification = vi.fn();

vi.mock("@/lib/digital-service-logic", () => ({
  DigitalService: {
    vendDigitalFulfilment,
  },
}));

vi.mock("@/server/orders", () => ({
  getOrder,
  setOrderStatus,
}));

vi.mock("@/lib/firestore/digital-orders", () => ({
  upsertDigitalOrder,
}));

vi.mock("@/lib/firestore/notifications", () => ({
  queueNotification,
}));

function createOrder(paymentMeta?: Record<string, unknown>): Order & { paymentMeta?: Record<string, unknown> } {
  return {
    id: "ORDER-1",
    items: [
      {
        id: "zesa-12345678901",
        name: "ZESA Tokens",
        price: 5,
        quantity: 1,
        image: "/images/Zesa.webp",
      },
    ],
    total: 5,
    totalUsd: 5,
    customerName: "Test Customer",
    customerEmail: "customer@example.com",
    customerPhone: "263771234567",
    status: "processing",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currencyCode: "840",
    paymentMeta,
  };
}

describe("digital fulfilment sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("vends a token when the gateway reports PAID", async () => {
    getOrder.mockResolvedValue(createOrder({
      accountNumber: "12345678901",
      serviceType: "ZESA",
    }));
    vendDigitalFulfilment.mockResolvedValue({
      success: true,
      token: "1111 2222 3333 4444",
      units: 18.2,
      receiptNumber: "REC-1",
    });

    const { syncDigitalFulfilmentForOrder } = await import("@/lib/digital-fulfilment");
    const result = await syncDigitalFulfilmentForOrder("ORDER-1", "PAID");

    expect(vendDigitalFulfilment).toHaveBeenCalledWith("ZESA", expect.objectContaining({
      orderReference: "ORDER-1",
      accountNumber: "12345678901",
      amountUsd: 5,
    }));
    expect(setOrderStatus).toHaveBeenCalledWith("ORDER-1", "SUCCESS", expect.objectContaining({
      token: "1111 2222 3333 4444",
      receiptNumber: "REC-1",
    }));
    expect(upsertDigitalOrder).toHaveBeenCalledWith(expect.objectContaining({
      orderReference: "ORDER-1",
      provisioningStatus: "completed",
      token: "1111 2222 3333 4444",
    }));
    expect(result.vendedData).toEqual(expect.objectContaining({
      token: "1111 2222 3333 4444",
      receiptNumber: "REC-1",
    }));
  });

  it("does not re-vend an already completed token purchase", async () => {
    getOrder.mockResolvedValue(createOrder({
      accountNumber: "12345678901",
      serviceType: "ZESA",
      token: "1111 2222 3333 4444",
      receiptNumber: "REC-1",
      vendedAt: new Date().toISOString(),
    }));

    const { syncDigitalFulfilmentForOrder } = await import("@/lib/digital-fulfilment");
    const result = await syncDigitalFulfilmentForOrder("ORDER-1", "SUCCESS");

    expect(vendDigitalFulfilment).not.toHaveBeenCalled();
    expect(upsertDigitalOrder).toHaveBeenCalledWith(expect.objectContaining({
      orderReference: "ORDER-1",
      provisioningStatus: "completed",
      token: "1111 2222 3333 4444",
    }));
    expect(result.vendedData).toEqual(expect.objectContaining({
      token: "1111 2222 3333 4444",
      receiptNumber: "REC-1",
    }));
  });
});
