import { beforeEach, describe, expect, it, vi } from "vitest";

const confirmSmileCashExpress = vi.fn();
const confirmEcocashExpress = vi.fn();
const confirmInnbucksExpress = vi.fn();
const confirmOmariExpress = vi.fn();
const confirmOneMoneyExpress = vi.fn();
const setOrderStatus = vi.fn();
const upsertPaymentIntent = vi.fn();

vi.mock("@/lib/payments/zb", () => ({
  confirmSmileCashExpress,
  confirmEcocashExpress,
  confirmInnbucksExpress,
  confirmOmariExpress,
  confirmOneMoneyExpress,
}));

vi.mock("@/server/orders", () => ({
  setOrderStatus,
}));

vi.mock("@/lib/firestore/payments", async () => {
  return {
    mapGatewayStatusToPaymentIntent: (status: string) => status.toLowerCase() === "success" ? "paid" : "submitted",
    upsertPaymentIntent,
  };
});

describe("POST /api/zb/checkout/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirms WalletPlus OTP payments and persists the result", async () => {
    confirmSmileCashExpress.mockResolvedValue({
      status: "SUCCESS",
      transactionReference: "TRX-1",
      responseMessage: "Confirmed",
    });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/zb/checkout/confirm", {
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
    expect(setOrderStatus).toHaveBeenCalledWith("ORDER-1", "SUCCESS", expect.objectContaining({
      gatewayReference: "TRX-1",
    }));
    expect(upsertPaymentIntent).toHaveBeenCalledWith(expect.objectContaining({
      orderReference: "ORDER-1",
      paymentMethod: "WALLETPLUS",
      gatewayReference: "TRX-1",
    }));
  });

  it("dispatches EcoCash OTP confirmation to the EcoCash gateway handler", async () => {
    confirmEcocashExpress.mockResolvedValue({
      status: "PENDING",
      transactionReference: "ECO-TRX-1",
      responseMessage: "Processing",
    });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/zb/checkout/confirm", {
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
    expect(confirmEcocashExpress).toHaveBeenCalledWith({
      otp: "123456",
      transactionReference: "ECO-TRX-1",
    });
    expect(confirmSmileCashExpress).not.toHaveBeenCalled();
  });

  it("dispatches OneMoney OTP confirmation to the OneMoney gateway handler", async () => {
    confirmOneMoneyExpress.mockResolvedValue({
      status: "SUCCESS",
      transactionReference: "ONE-TRX-1",
      responseMessage: "Confirmed",
    });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/zb/checkout/confirm", {
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
    expect(confirmOneMoneyExpress).toHaveBeenCalledWith({
      otp: "654321",
      transactionReference: "ONE-TRX-1",
    });
  });
});
