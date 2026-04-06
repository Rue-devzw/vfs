import { beforeEach, describe, expect, it, vi } from "vitest";

describe("payment intent status mapping", () => {
  beforeEach(() => {
    vi.resetModules();
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

  it("maps AWAITING_OTP into pending confirmation", async () => {
    const { mapGatewayStatusToPaymentIntent } = await import("@/lib/firestore/payments");
    expect(mapGatewayStatusToPaymentIntent("AWAITING_OTP")).toBe("pending_confirmation");
  });
});
