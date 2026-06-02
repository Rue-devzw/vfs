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
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "dummy";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "dummy.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "dummy-project";
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "dummy.appspot.com";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123456789";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123456789:web:abcdef";
    process.env.FIREBASE_PROJECT_ID = "dummy-project";
    process.env.FIREBASE_CLIENT_EMAIL = "dummy@example.com";
    process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDlEZW+fv4PIxj6\n-----END PRIVATE KEY-----\n";
    process.env.ADMIN_SESSION_PASSWORD = "a".repeat(32);
    process.env.ZB_API_KEY = "key";
    process.env.ZB_API_SECRET = "secret";
  });

  it("vends a token when the gateway reports PAID", async () => {
    getOrder.mockResolvedValue(createOrder({
      accountNumber: "12345678901",
      serviceType: "ZESA",
      gatewayReference: "SP-REF-1",
    }));
    vendDigitalFulfilment.mockResolvedValue({
      success: true,
      orderReference: "EGRESS-ORDER-1",
      transactionReference: "1234567890123",
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
      providerOrderReference: "EGRESS-ORDER-1",
      providerTransactionReference: "1234567890123",
      providerGatewayStatus: "PAID",
      receiptDetails: expect.objectContaining({
        energyCharge: 4.8,
        levyAmount: 0.24,
      }),
    }));
    expect(upsertDigitalOrder).toHaveBeenCalledWith(expect.objectContaining({
      orderReference: "ORDER-1",
      provisioningStatus: "completed",
      resultPayload: expect.objectContaining({
        providerOrderReference: "EGRESS-ORDER-1",
        providerTransactionReference: "1234567890123",
      }),
      token: "1111 2222 3333 4444",
    }));
    expect(result.vendedData).toEqual(expect.objectContaining({
      token: "1111 2222 3333 4444",
      orderReference: "EGRESS-ORDER-1",
      transactionReference: "1234567890123",
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

  it("uses the persisted DSTV provider amount instead of the charged total during vend attempts", async () => {
    getOrder.mockResolvedValue({
      ...createOrder({
        accountNumber: "4117068963",
        serviceType: "DSTV",
        gatewayReference: "BQVZ2782TYHP",
        serviceMeta: {
          accountName: "Mr A ROSCOE",
          customerMobile: "0711111111",
          paymentType: "BOUQUET",
          bouquet: "LITES20",
          addon: "ADD2SEC",
          months: "1",
          providerAmountUsd: "23.00",
          serviceChargeUsd: "3.00",
        },
      }),
      items: [
        {
          id: "dstv-4117068963",
          name: "DStv Payments Purchase",
          price: 23,
          quantity: 1,
          image: "/images/dstv-logo.png",
        },
        {
          id: "fee-dstv",
          name: "Platform Convenience Fee",
          price: 3,
          quantity: 1,
          image: "/images/logo.webp",
        },
      ],
      total: 26,
      totalUsd: 26,
    });
    vendDigitalFulfilment.mockResolvedValue({
      success: true,
      receiptNumber: "DSTV-RCT-1",
      receiptDetails: {
        service: "DStv Payments",
      },
    });

    const { syncDigitalFulfilmentForOrder } = await import("@/lib/digital-fulfilment");
    await syncDigitalFulfilmentForOrder("ORDER-1", "PAID");

    expect(vendDigitalFulfilment).toHaveBeenCalledWith("DSTV", expect.objectContaining({
      orderReference: "ORDER-1",
      gatewayReference: "BQVZ2782TYHP",
      accountNumber: "4117068963",
      amountUsd: 23,
      serviceMeta: expect.objectContaining({
        providerAmountUsd: "23.00",
        serviceChargeUsd: "3.00",
        customerName: "Mr A ROSCOE",
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

  it("keeps provider timeouts retryable instead of recording a permanent vend failure", async () => {
    getOrder.mockResolvedValue(createOrder({
      accountNumber: "15155617",
      serviceType: "CIMAS",
      gatewayReference: "PMFG1330AAIB",
      serviceMeta: {
        referenceType: "M",
      },
    }));
    const { EgressGatewayError } = await import("@/lib/payments/egress");
    vendDigitalFulfilment.mockRejectedValue(
      new EgressGatewayError(504, "Provider request timed out while waiting for a response."),
    );

    const { syncDigitalFulfilmentForOrder } = await import("@/lib/digital-fulfilment");
    const result = await syncDigitalFulfilmentForOrder("ORDER-1", "PAID");

    expect(setOrderStatus).toHaveBeenCalledWith("ORDER-1", "PAID", expect.objectContaining({
      accountNumber: "15155617",
      serviceType: "CIMAS",
      fulfilmentStatus: "retry_pending",
      fulfilmentLastError: "Provider request timed out while waiting for a response.",
    }));
    expect(setOrderStatus.mock.calls[0][2]).not.toEqual(expect.objectContaining({
      vendFailureMessage: expect.any(String),
    }));
    expect(upsertDigitalOrder).toHaveBeenCalledWith(expect.objectContaining({
      orderReference: "ORDER-1",
      serviceId: "cimas",
      provisioningStatus: "processing",
      redactCustomerData: true,
      resultPayload: expect.objectContaining({
        status: "RETRY_PENDING",
      }),
    }));
    expect(result.vendedData).toEqual(expect.objectContaining({
      message: expect.stringContaining("will retry shortly"),
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
