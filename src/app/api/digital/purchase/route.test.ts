import { beforeEach, describe, expect, it, vi } from "vitest";

const createPendingOrder = vi.fn();
const setOrderStatus = vi.fn();
const validateAccount = vi.fn();
const initiatePurchase = vi.fn();
const upsertDigitalOrder = vi.fn();
const verifyCustomerSession = vi.fn();

vi.mock("@/server/orders", () => ({
  createPendingOrder,
  setOrderStatus,
}));

vi.mock("@/lib/digital-service-logic", () => ({
  DigitalService: {
    validateAccount,
    initiatePurchase,
  },
  DigitalServiceUnavailableError: class DigitalServiceUnavailableError extends Error {
    status: number;

    constructor(message: string, status = 501) {
      super(message);
      this.name = "DigitalServiceUnavailableError";
      this.status = status;
    }
  },
}));

vi.mock("@/lib/firestore/digital-orders", () => ({
  upsertDigitalOrder,
}));

vi.mock("@/lib/auth", () => ({
  verifyCustomerSession,
}));

vi.mock("@/lib/currency", async () => {
  const actual = await vi.importActual<typeof import("@/lib/currency")>("@/lib/currency");
  return {
    ...actual,
    convertFromUsd: (amount: number) => amount,
    convertToUsd: (amount: number) => amount,
  };
});

vi.mock("@/lib/zb-exchange-rate", () => ({
  getExchangeRate: () => Promise.resolve(1),
}));

describe("POST /api/digital/purchase", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createPendingOrder.mockResolvedValue(undefined);
    setOrderStatus.mockResolvedValue(undefined);
    upsertDigitalOrder.mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_BASE_URL = "https://app.test";
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

  it("allows CIMAS user-entered payment amounts that differ from the validated balance", async () => {
    verifyCustomerSession.mockResolvedValue({
      email: "customer@example.com",
      name: "Customer Name",
    });
    validateAccount.mockResolvedValue({
      success: true,
      accountName: "MRS BANANA KIWI",
      accountNumber: "11445000",
      billerName: "CIMAS",
      amountToBePaid: "565380",
      currency: "USD",
      raw: {
        parsed: {
          referenceName: "11445000-MRS BANANA KIWI",
          referenceNumber: "11445000",
          customerName: "MRS BANANA KIWI",
          accountType: "PM",
          currentProduct: "PRIVATE HOSPITAL",
          currency: "USD",
          currentBalance: 565380,
          amountToBePaid: "565380",
        },
      },
    });
    initiatePurchase.mockResolvedValue({
      reference: "DIGI-ORDER-1",
      transactionReference: "SMILE-REF-1",
      status: "PENDING",
      amount: 124.45,
      currencyCode: "840",
      exchangeRate: 1,
      amountUsd: 124.45,
    });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/digital/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: "CIMAS",
        accountNumber: "11445000",
        amount: 123.45,
        paymentMethod: "WALLETPLUS",
        currencyCode: "840",
        customerMobile: "0771234567",
        serviceMeta: {
          referenceType: "M",
        },
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      providerAmountUsd: 123.45,
      serviceChargeUsd: 1,
      chargedAmountUsd: 124.45,
    }));
    expect(validateAccount).toHaveBeenCalledWith("CIMAS", "11445000", {
      referenceType: "M",
    });
    expect(initiatePurchase).toHaveBeenCalledWith(expect.objectContaining({
      serviceType: "CIMAS",
      accountNumber: "11445000",
      amount: 124.45,
      currencyCode: "840",
      serviceMeta: expect.objectContaining({
        referenceType: "M",
        providerAmountUsd: "123.45",
        serviceChargeUsd: "1.00",
        accountCurrency: "USD",
      }),
    }), "https://app.test");
    expect(createPendingOrder).toHaveBeenCalledWith(expect.objectContaining({
      reference: "DIGI-ORDER-1",
      totalUsd: 124.45,
      notes: expect.stringContaining("Provider amount USD 123.45"),
    }));
    expect(upsertDigitalOrder).toHaveBeenCalledWith(expect.objectContaining({
      orderReference: "DIGI-ORDER-1",
      serviceId: "cimas",
      resultPayload: expect.objectContaining({
        providerAmountUsd: 123.45,
        serviceChargeUsd: 1,
        chargedAmountUsd: 124.45,
      }),
    }));
    expect(setOrderStatus).toHaveBeenCalledWith(
      "DIGI-ORDER-1",
      "PENDING",
      expect.objectContaining({
        providerAmountUsd: 123.45,
        serviceChargeUsd: 1,
        chargedAmountUsd: 124.45,
      }),
      expect.any(Object),
    );
  });

  it("returns a clear 503 when the order database is unreachable after payment initiation", async () => {
    verifyCustomerSession.mockResolvedValue({
      email: "customer@example.com",
      name: "Customer Name",
    });
    validateAccount.mockResolvedValue({
      success: true,
      accountName: "Mr A ROSCOE",
      accountNumber: "4117068963",
      billerName: "DSTV",
      raw: {
        parsed: {
          customerName: "Mr A ROSCOE",
          currency: "USD",
          dueAmount: "-17915.04",
          dueDate: "2026-06-15",
        },
      },
    });
    initiatePurchase.mockResolvedValue({
      reference: "DIGI-DSTV-1",
      transactionReference: "SMILE-DSTV-REF-1",
      status: "PENDING",
      amount: 11,
      currencyCode: "840",
      exchangeRate: 1,
      amountUsd: 11,
    });
    const persistenceError = new Error("13 INTERNAL: Received RST_STREAM with code 2 triggered by internal client error: read EHOSTUNREACH") as Error & {
      code?: number;
      details?: string;
    };
    persistenceError.code = 13;
    persistenceError.details = "Received RST_STREAM with code 2 triggered by internal client error: read EHOSTUNREACH";
    createPendingOrder.mockRejectedValueOnce(persistenceError);

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/digital/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: "DSTV",
        accountNumber: "4117068963",
        amount: 10,
        paymentMethod: "WALLETPLUS",
        currencyCode: "840",
        customerMobile: "0772000000",
        serviceMeta: {
          paymentType: "TOPUP",
        },
      }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: false,
      code: "PERSISTENCE_UNAVAILABLE",
      reference: "DIGI-DSTV-1",
      transactionReference: "SMILE-DSTV-REF-1",
      status: "PENDING",
    }));
    expect(initiatePurchase).toHaveBeenCalledWith(expect.objectContaining({
      serviceType: "DSTV",
      amount: 11,
      serviceMeta: expect.objectContaining({
        paymentType: "TOPUP",
        providerAmountUsd: "10.00",
        serviceChargeUsd: "1.00",
      }),
    }), "https://app.test");
    expect(upsertDigitalOrder).not.toHaveBeenCalled();
    expect(setOrderStatus).not.toHaveBeenCalled();
  });

  it("reuses a prior DSTV validation snapshot during payment instead of validating again", async () => {
    verifyCustomerSession.mockResolvedValue({
      email: "customer@example.com",
      name: "Customer Name",
    });
    initiatePurchase.mockResolvedValue({
      reference: "DIGI-DSTV-2",
      transactionReference: "SMILE-DSTV-REF-2",
      status: "PENDING",
      amount: 11,
      currencyCode: "840",
      exchangeRate: 1,
      amountUsd: 11,
    });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/digital/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: "DSTV",
        accountNumber: "4117068963",
        amount: 10,
        paymentMethod: "WALLETPLUS",
        currencyCode: "840",
        customerMobile: "0772000000",
        serviceMeta: {
          paymentType: "TOPUP",
        },
        validationSnapshot: {
          successful: true,
          billerId: "DSTV",
          customerAccount: "4117068963",
          responseDetails: "Customer Name | Mr A ROSCOE| Currency : USD| Due Amount : -17915.04| Due Date : 2026-06-15",
          parsed: {
            customerName: "Mr A ROSCOE",
            currency: "USD",
            dueAmount: "-17915.04",
            dueDate: "2026-06-15",
          },
        },
      }),
    }));

    expect(response.status).toBe(200);
    expect(validateAccount).not.toHaveBeenCalled();
    expect(initiatePurchase).toHaveBeenCalledWith(expect.objectContaining({
      serviceType: "DSTV",
      accountNumber: "4117068963",
      amount: 11,
      serviceMeta: expect.objectContaining({
        accountName: "Mr A ROSCOE",
        billerName: "DSTV",
        providerAmountUsd: "10.00",
        serviceChargeUsd: "1.00",
      }),
    }), "https://app.test");
    expect(createPendingOrder).toHaveBeenCalledWith(expect.objectContaining({
      reference: "DIGI-DSTV-2",
      customerName: "Customer Name",
    }));
  });
});
