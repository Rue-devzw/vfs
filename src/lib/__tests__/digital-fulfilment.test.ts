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
      gatewayReference: "SP-REF-1",
    }));
    vendDigitalFulfilment.mockResolvedValue({
      success: true,
      token: "1111 2222 3333 4444",
      units: 18.2,
      receiptNumber: "REC-1",
      receiptDetails: {
        receiptDate: "2026-04-17",
        receiptTime: "10:00",
        customerAddress: "Address 1, Harare",
        energyCharge: 4.8,
        levyAmount: 0.24,
        vatAmount: 0.63,
      },
    });

    const { syncDigitalFulfilmentForOrder } = await import("@/lib/digital-fulfilment");
    const result = await syncDigitalFulfilmentForOrder("ORDER-1", "PAID");

    expect(vendDigitalFulfilment).toHaveBeenCalledWith("ZESA", expect.objectContaining({
      orderReference: "ORDER-1",
      gatewayReference: "SP-REF-1",
      accountNumber: "12345678901",
      amountUsd: 5,
    }));
    expect(setOrderStatus).toHaveBeenCalledWith("ORDER-1", "DELIVERED", expect.objectContaining({
      token: "1111 2222 3333 4444",
      receiptNumber: "REC-1",
      providerGatewayStatus: "PAID",
      receiptDetails: expect.objectContaining({
        energyCharge: 4.8,
        levyAmount: 0.24,
      }),
    }));
    expect(upsertDigitalOrder).toHaveBeenCalledWith(expect.objectContaining({
      orderReference: "ORDER-1",
      provisioningStatus: "completed",
      token: "1111 2222 3333 4444",
    }));
    expect(result.vendedData).toEqual(expect.objectContaining({
      token: "1111 2222 3333 4444",
      receiptNumber: "REC-1",
      receiptDetails: expect.objectContaining({
        customerAddress: "Address 1, Harare",
      }),
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
    expect(setOrderStatus).toHaveBeenCalledWith("ORDER-1", "DELIVERED", expect.objectContaining({
      token: "1111 2222 3333 4444",
      receiptNumber: "REC-1",
      providerGatewayStatus: "SUCCESS",
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

  it("uses validated account data during vend attempts", async () => {
    getOrder.mockResolvedValue(createOrder({
      accountNumber: "12345678901",
      serviceType: "ZESA",
      gatewayReference: "SP-REF-2",
      serviceMeta: {
        accountName: "VALLEY FARM CUSTOMER",
      },
    }));
    vendDigitalFulfilment.mockResolvedValue({
      success: true,
      token: "1111 2222 3333 4444",
      receiptNumber: "REC-1",
    });

    const { syncDigitalFulfilmentForOrder } = await import("@/lib/digital-fulfilment");
    await syncDigitalFulfilmentForOrder("ORDER-1", "PAID");

    expect(vendDigitalFulfilment).toHaveBeenCalledWith("ZESA", expect.objectContaining({
      gatewayReference: "SP-REF-2",
      serviceMeta: expect.objectContaining({
        accountName: "VALLEY FARM CUSTOMER",
        customerName: "VALLEY FARM CUSTOMER",
      }),
    }));
  });

  it("does not retry vending after a recorded vend failure and redacts the digital record", async () => {
    getOrder.mockResolvedValue(createOrder({
      accountNumber: "12345678901",
      serviceType: "ZESA",
      vendFailureMessage: "ZESA vending failed after payment confirmation.",
    }));

    const { syncDigitalFulfilmentForOrder } = await import("@/lib/digital-fulfilment");
    const result = await syncDigitalFulfilmentForOrder("ORDER-1", "PAID");

    expect(vendDigitalFulfilment).not.toHaveBeenCalled();
    expect(upsertDigitalOrder).toHaveBeenCalledWith(expect.objectContaining({
      orderReference: "ORDER-1",
      provisioningStatus: "failed",
      redactCustomerData: true,
      resultPayload: expect.objectContaining({
        status: "FAILED",
      }),
    }));
    expect(result.vendedData).toEqual(expect.objectContaining({
      issue: true,
      message: "ZESA vending failed after payment confirmation.",
    }));
  });

  it("marks unavailable airtime fulfilment as failed and redacts the digital record", async () => {
    getOrder.mockResolvedValue({
      ...createOrder({
        accountNumber: "0771234567",
        serviceType: "AIRTIME",
        serviceMeta: {
          network: "Econet",
          productType: "Airtime",
        },
      }),
      items: [
        {
          id: "airtime-0771234567",
          name: "Airtime",
          price: 5,
          quantity: 1,
          image: "/images/airtime_illustration.png",
        },
      ],
    });

    const { syncDigitalFulfilmentForOrder } = await import("@/lib/digital-fulfilment");
    const result = await syncDigitalFulfilmentForOrder("ORDER-1", "PAID");

    expect(vendDigitalFulfilment).not.toHaveBeenCalled();
    expect(upsertDigitalOrder).toHaveBeenCalledWith(expect.objectContaining({
      orderReference: "ORDER-1",
      serviceId: "airtime",
      provisioningStatus: "failed",
      redactCustomerData: true,
    }));
    expect(result.vendedData).toEqual(expect.objectContaining({
      issue: true,
      message: "Airtime and data payments are temporarily unavailable.",
    }));
  });
});
