import { beforeEach, describe, expect, it, vi } from "vitest";

describe("smile pay client", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ZB_API_KEY = "key";
    process.env.ZB_API_SECRET = "secret";
    process.env.SMILE_PAY_API_BASE_URL = "https://zb.example.com/payments-gateway";

    // Firebase (satisfied by Zod validation in env.ts)
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

  it("initiates standard transaction and returns payment URL", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        paymentUrl: "https://pay.example.com/redirect",
        transactionReference: "TRX-1",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { initiateSmilePayStandardCheckout } = await import("@/lib/payments/smile-pay");
    const result = await initiateSmilePayStandardCheckout({
      orderReference: "ORDER-1",
      amount: 12,
      returnUrl: "https://app.test/store/smile-pay/return",
      resultUrl: "https://app.test/api/payments/webhook/smile-pay",
      itemName: "Order",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.paymentUrl).toBe("https://pay.example.com/redirect");
    expect(result.transactionReference).toBe("TRX-1");
  });

  it("initiates mpgs card express and returns 3D Secure handoff HTML", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status: "PENDING_3DS",
        authenticationStatus: "AUTHENTICATION_REQUIRED",
        redirectHtml: "<html><body>3ds</body></html>",
        transactionReference: "CARD-TRX-2",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { initiateMpgsCardExpress } = await import("@/lib/payments/smile-pay");
    const result = await initiateMpgsCardExpress({
      orderReference: "ORDER-CARD-1",
      amount: 12,
      returnUrl: "https://app.test/store/smile-pay/return",
      resultUrl: "https://app.test/api/payments/webhook/smile-pay",
      itemName: "Order",
      itemDescription: "Card order",
      currencyCode: "840",
      paymentMethod: "CARD",
      pan: "2223000000000007",
      expMonth: "01",
      expYear: "39",
      securityCode: "100",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.status).toBe("PENDING_3DS");
    expect(result.authenticationStatus).toBe("AUTHENTICATION_REQUIRED");
    expect(result.redirectHtml).toContain("3ds");
  });

  it("initiates WalletPlus express and returns transaction reference", async () => {
    const body = {
      status: "PENDING",
      transactionReference: "EXP-TRX-1",
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { initiateSmileCashExpress } = await import("@/lib/payments/smile-pay");
    const result = await initiateSmileCashExpress({
      orderReference: "ORDER-2",
      amount: 20,
      resultUrl: "https://app.test/api/payments/webhook/smile-pay",
      itemName: "Order",
      itemDescription: "Order item",
      currencyCode: "840",
      customerMobile: "263771234567",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.transactionReference).toBe(body.transactionReference);
    expect(result.status).toBe(body.status);
  });

  it("normalizes local mobile numbers before sending SmileCash requests", async () => {
    const body = {
      status: "PENDING",
      transactionReference: "EXP-TRX-2",
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { initiateSmileCashExpress } = await import("@/lib/payments/smile-pay");
    await initiateSmileCashExpress({
      orderReference: "ORDER-4",
      amount: 20,
      resultUrl: "https://app.test/api/payments/webhook/smile-pay",
      itemName: "Order",
      itemDescription: "Order item",
      currencyCode: "840",
      customerMobile: "0771111111",
    });

    const firstCall = (fetchMock.mock.calls as unknown[])[0];
    if (!Array.isArray(firstCall) || firstCall.length < 2) throw new Error("Mock call malformed");
    const init = firstCall[1] as RequestInit | undefined;
    if (!init?.body || typeof init.body !== "string") throw new Error("Missing request body");
    const callBody = JSON.parse(init.body);
    expect(callBody.customerMobile).toBe("263771111111");
    expect(callBody.zbWalletMobile).toBe("263771111111");
  });

  it("surfaces a SmileCash provisioning hint when the merchant is not enabled for WalletPlus", async () => {
    const body = {
      message: "Checking account not found",
    };
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 409,
      text: async () => JSON.stringify(body),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { initiateSmileCashExpress } = await import("@/lib/payments/smile-pay");

    await expect(
      initiateSmileCashExpress({
        orderReference: "ORDER-5",
        amount: 20,
        resultUrl: "https://app.test/api/payments/webhook/smile-pay",
        itemName: "Order",
        itemDescription: "Order item",
        currencyCode: "840",
        customerMobile: "263771234567",
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("SmileCash is not provisioned"),
    });
  });

  it("initiates ZWG express and applies conversion (mocked behavior check)", async () => {
    const body = {
      status: "PENDING",
      transactionReference: "ZWG-TRX-1",
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { initiateSmileCashExpress } = await import("@/lib/payments/smile-pay");
    const result = await initiateSmileCashExpress({
      orderReference: "ORDER-3",
      amount: 250.50, // This would be the converted ZWG amount from the caller
      resultUrl: "https://app.test/api/payments/webhook/smile-pay",
      itemName: "ZWG Order",
      itemDescription: "Order in ZWG",
      currencyCode: "924",
      customerMobile: "263771234567",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const firstCall = (fetchMock.mock.calls as unknown[])[0];
    if (!Array.isArray(firstCall) || firstCall.length < 2) throw new Error("Mock call malformed");
    const init = firstCall[1] as RequestInit | undefined;
    if (!init?.body || typeof init.body !== "string") throw new Error("Missing request body");
    const callBody = JSON.parse(init.body);
    expect(callBody.currencyCode).toBe("924");
    expect(callBody.amount).toBe(250.50);
    expect(result.transactionReference).toBe(body.transactionReference);
  });

  describe("utility services", () => {
    it("validates utility account and returns success", async () => {
      const body = {
        success: true,
        accountName: "John Doe",
        accountNumber: "12345",
      };
      const fetchMock = vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(body),
      }));
      vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

      const { validateSmilePayUtility } = await import("@/lib/payments/smile-pay");
      const result = await validateSmilePayUtility({
        billerCode: "ZETDC",
        accountNumber: "12345",
      });

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(result.success).toBe(true);
      expect(result.accountName).toBe("John Doe");
    });

    it("vends utility and returns token", async () => {
      const body = {
        success: true,
        token: "1234-5678-9012",
        units: 50.5,
        receiptNumber: "RCT-1",
      };
      const fetchMock = vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(body),
      }));
      vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

      const { vendSmilePayUtility } = await import("@/lib/payments/smile-pay");
      const result = await vendSmilePayUtility({
        billerCode: "ZETDC",
        accountNumber: "12345",
        amount: 10,
        transactionReference: "TRX-1",
      });

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(result.success).toBe(true);
      expect(result.token).toBe("1234-5678-9012");
    });
  });
});
