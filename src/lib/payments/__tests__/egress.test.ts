import { beforeEach, describe, expect, it } from "vitest";

describe("egress gateway errors", () => {
  beforeEach(() => {
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

  it("treats upstream JBoss 404 endpoint errors as provider unavailable", async () => {
    const { EgressGatewayError, isEgressServiceUnavailable } = await import("@/lib/payments/egress");
    const error = new EgressGatewayError(
      404,
      "EGRESS endpoint was not found. Check ZB_EGRESS_API_URL with the provider.",
      "<html><body><h1>JBWEB000065: HTTP Status 404 - /billpayment-service/BillPaymentService</h1><p>JBWEB000124: The requested resource is not available.</p></body></html>",
    );

    expect(isEgressServiceUnavailable(error)).toBe(true);
  });

  it("does not treat plain customer-level 404s as provider unavailable", async () => {
    const { EgressGatewayError, isEgressServiceUnavailable } = await import("@/lib/payments/egress");
    const error = new EgressGatewayError(404, "Customer account not found.", "Customer account not found.");

    expect(isEgressServiceUnavailable(error)).toBe(false);
  });
});
