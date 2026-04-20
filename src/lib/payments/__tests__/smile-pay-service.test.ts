import { beforeEach, describe, expect, it, vi } from "vitest";

describe("smile pay service", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ZB_API_KEY = "key";
    process.env.ZB_API_SECRET = "secret";
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
  });

  it("treats SmileCash initiation with a transaction reference as awaiting OTP", async () => {
    const { normalizeSmilePayInitiationResult } = await import("@/lib/payments/smile-pay-service");
    const result = normalizeSmilePayInitiationResult("WALLETPLUS", {
      transactionReference: "TXN-123",
      status: "PENDING",
      responseMessage: "Payment initiated",
    });

    expect(result.status).toBe("AWAITING_OTP");
    expect(result.transactionReference).toBe("TXN-123");
  });

  it("treats Omari initiation with a transaction reference as awaiting OTP", async () => {
    const { normalizeSmilePayInitiationResult } = await import("@/lib/payments/smile-pay-service");
    const result = normalizeSmilePayInitiationResult("OMARI", {
      transactionReference: "TXN-456",
      status: "PENDING",
      responseMessage: "Payment initiated",
    });

    expect(result.status).toBe("AWAITING_OTP");
    expect(result.transactionReference).toBe("TXN-456");
  });

  it("does not rewrite card initiation responses", async () => {
    const { normalizeSmilePayInitiationResult } = await import("@/lib/payments/smile-pay-service");
    const result = normalizeSmilePayInitiationResult("CARD", {
      transactionReference: "TXN-123",
      status: "PENDING_3DS",
      redirectHtml: "<html><body>3ds</body></html>",
      authenticationStatus: "AUTHENTICATION_REQUIRED",
    });

    expect(result.status).toBe("PENDING_3DS");
    expect(result.redirectHtml).toContain("3ds");
  });

  it("throws a helpful error when card initiation succeeds without a usable 3DS handoff", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status: "PENDING",
        responseCode: "00",
        responseMessage: "Success",
        transactionReference: "CARD-NO-URL-1",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { initiateSmilePayOrderPayment } = await import("@/lib/payments/smile-pay-service");

    await expect(
      initiateSmilePayOrderPayment({
        reference: "ORDER-CARD-1",
        amount: 20,
        currencyCode: "840",
        paymentMethod: "CARD",
        returnUrl: "https://app.test/store/smile-pay/return",
        resultUrl: "https://app.test/api/payments/webhook/smile-pay",
        itemName: "Order",
        itemDescription: "Order item",
        customerName: "Debug User",
        cardDetails: {
          pan: "2223000000000007",
          expMonth: "01",
          expYear: "39",
          securityCode: "100",
        },
      }),
    ).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("did not return a usable 3D Secure handoff"),
    });
  });

  it("throws a helpful Omari initiation error when the gateway rejects leg 1 immediately", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status: "FAILED",
        responseCode: "99",
        responseMessage: "Failed to initiate payment",
        transactionReference: "OMA-FAIL-1",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { initiateSmilePayOrderPayment } = await import("@/lib/payments/smile-pay-service");

    await expect(
      initiateSmilePayOrderPayment({
        reference: "ORDER-OMARI-1",
        amount: 20,
        currencyCode: "840",
        paymentMethod: "OMARI",
        returnUrl: "https://app.test/store/smile-pay/return",
        resultUrl: "https://app.test/api/payments/webhook/smile-pay",
        itemName: "Order",
        itemDescription: "Order item",
        customerName: "Debug User",
        customerMobile: "0771111111",
      }),
    ).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("Omari initiation was rejected"),
    });
  });

  it("throws a helpful OneMoney initiation error when the gateway rejects leg 1 immediately", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status: "FAILED",
        responseCode: "99",
        responseMessage: "Failed to charge OneMoney account",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { initiateSmilePayOrderPayment } = await import("@/lib/payments/smile-pay-service");

    await expect(
      initiateSmilePayOrderPayment({
        reference: "ORDER-ONEMONEY-1",
        amount: 20,
        currencyCode: "840",
        paymentMethod: "ONEMONEY",
        returnUrl: "https://app.test/store/smile-pay/return",
        resultUrl: "https://app.test/api/payments/webhook/smile-pay",
        itemName: "Order",
        itemDescription: "Order item",
        customerName: "Debug User",
        customerMobile: "0771111111",
      }),
    ).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("OneMoney initiation was rejected"),
    });
  });
});
