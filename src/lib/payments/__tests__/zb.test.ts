import { beforeEach, describe, expect, it, vi } from "vitest";

describe("zb payments client", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ZB_API_KEY = "key";
    process.env.ZB_API_SECRET = "secret";
    process.env.ZB_API_BASE_URL = "https://zb.example.com/payments-gateway";

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

    const { initiateZbStandardCheckout } = await import("@/lib/payments/zb");
    const result = await initiateZbStandardCheckout({
      orderReference: "ORDER-1",
      amount: 12,
      returnUrl: "https://app.test/store/zb/return",
      resultUrl: "https://app.test/api/zb/webhook",
      itemName: "Order",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.paymentUrl).toBe("https://pay.example.com/redirect");
    expect(result.transactionReference).toBe("TRX-1");
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

    const { initiateSmileCashExpress } = await import("@/lib/payments/zb");
    const result = await initiateSmileCashExpress({
      orderReference: "ORDER-2",
      amount: 20,
      resultUrl: "https://app.test/api/zb/webhook",
      itemName: "Order",
      itemDescription: "Order item",
      currencyCode: "USD",
      customerMobile: "263771234567",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.transactionReference).toBe(body.transactionReference);
    expect(result.status).toBe(body.status);
  });
});
