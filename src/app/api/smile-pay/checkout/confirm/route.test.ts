import { beforeEach, describe, expect, it, vi } from "vitest";

const confirmSmilePayOrderPayment = vi.fn();

vi.mock("@/lib/payments/smile-pay-service", () => ({
  confirmSmilePayOrderPayment,
}));

describe("POST /api/smile-pay/checkout/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("confirms WalletPlus OTP payments and persists the result", async () => {
    confirmSmilePayOrderPayment.mockResolvedValue({
      status: "SUCCESS",
      transactionReference: "TRX-1",
      responseMessage: "Confirmed",
    });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/smile-pay/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: "ORDER-1",
        transactionReference: "TRX-1",
        otp: "123456",
        paymentMethod: "WALLETPLUS",
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      status: "SUCCESS",
      transactionReference: "TRX-1",
    }));
    expect(confirmSmilePayOrderPayment).toHaveBeenCalledWith({
      reference: "ORDER-1",
      transactionReference: "TRX-1",
      otp: "123456",
      paymentMethod: "WALLETPLUS",
    });
  });

  it("passes EcoCash OTP confirmation through the shared payment service", async () => {
    confirmSmilePayOrderPayment.mockResolvedValue({
      status: "PENDING",
      transactionReference: "ECO-TRX-1",
      responseMessage: "Processing",
    });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/smile-pay/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: "ORDER-2",
        transactionReference: "ECO-TRX-1",
        otp: "123456",
        paymentMethod: "ECOCASH",
      }),
    }));

    expect(response.status).toBe(200);
    expect(confirmSmilePayOrderPayment).toHaveBeenCalledWith({
      reference: "ORDER-2",
      paymentMethod: "ECOCASH",
      otp: "123456",
      transactionReference: "ECO-TRX-1",
    });
  });

  it("passes OneMoney OTP confirmation through the shared payment service", async () => {
    confirmSmilePayOrderPayment.mockResolvedValue({
      status: "SUCCESS",
      transactionReference: "ONE-TRX-1",
      responseMessage: "Confirmed",
    });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/smile-pay/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: "ORDER-3",
        transactionReference: "ONE-TRX-1",
        otp: "654321",
        paymentMethod: "ONEMONEY",
      }),
    }));

    expect(response.status).toBe(200);
    expect(confirmSmilePayOrderPayment).toHaveBeenCalledWith({
      reference: "ORDER-3",
      paymentMethod: "ONEMONEY",
      otp: "654321",
      transactionReference: "ONE-TRX-1",
    });
  });

  it("passes Omari mobile context through OTP confirmation", async () => {
    confirmSmilePayOrderPayment.mockResolvedValue({
      status: "SUCCESS",
      transactionReference: "OMA-TRX-1",
      responseMessage: "Confirmed",
    });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/smile-pay/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference: "ORDER-4",
        transactionReference: "OMA-TRX-1",
        otp: "112233",
        paymentMethod: "OMARI",
        customerMobile: "0771111111",
      }),
    }));

    expect(response.status).toBe(200);
    expect(confirmSmilePayOrderPayment).toHaveBeenCalledWith({
      reference: "ORDER-4",
      paymentMethod: "OMARI",
      otp: "112233",
      transactionReference: "OMA-TRX-1",
      customerMobile: "0771111111",
    });
  });
});
