import { beforeEach, describe, expect, it, vi } from "vitest";

const initiateSmileCashExpress = vi.fn();
const initiateEcocashExpress = vi.fn();
const initiateInnbucksExpress = vi.fn();
const initiateOmariExpress = vi.fn();
const initiateOneMoneyExpress = vi.fn();
const initiateZbStandardCheckout = vi.fn();

vi.mock("@/lib/payments/zb", () => ({
  initiateSmileCashExpress,
  initiateEcocashExpress,
  initiateInnbucksExpress,
  initiateOmariExpress,
  initiateOneMoneyExpress,
  initiateZbStandardCheckout,
}));

vi.mock("@/lib/currency", () => ({
  convertFromUsd: (amount: number) => amount,
  getZwgPerUsdRate: () => 1,
}));

vi.mock("@/lib/env", () => ({
  env: {
    ZB_DIGITAL_CHECKOUT_URL: "https://checkout.example.com",
  },
}));

describe("digital provider purchase initiation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not inject a fallback payment url for WalletPlus express", async () => {
    initiateSmileCashExpress.mockResolvedValue({
      status: "PENDING",
      transactionReference: "EXP-TRX-1",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.initiatePurchase({
      serviceType: "ZESA",
      accountNumber: "12345678901",
      amount: 5,
      paymentMethod: "WALLETPLUS",
      customerMobile: "263771234567",
    }, "https://app.test");

    expect(result.paymentUrl).toBeUndefined();
    expect(result.transactionReference).toBe("EXP-TRX-1");
  });

  it("still uses the configured checkout url fallback for card payments", async () => {
    initiateZbStandardCheckout.mockResolvedValue({
      status: "PENDING",
      transactionReference: "CARD-TRX-1",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.initiatePurchase({
      serviceType: "ZESA",
      accountNumber: "12345678901",
      amount: 5,
      paymentMethod: "CARD",
    }, "https://app.test");

    expect(result.paymentUrl).toBe("https://checkout.example.com");
    expect(result.transactionReference).toBe("CARD-TRX-1");
  });

  it("supports OneMoney express initiation without injecting a card redirect", async () => {
    initiateOneMoneyExpress.mockResolvedValue({
      status: "AWAITING_OTP",
      transactionReference: "ONE-TRX-1",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.initiatePurchase({
      serviceType: "ZESA",
      accountNumber: "12345678901",
      amount: 5,
      paymentMethod: "ONEMONEY",
      customerMobile: "263771234567",
    }, "https://app.test");

    expect(result.status).toBe("AWAITING_OTP");
    expect(result.paymentUrl).toBeUndefined();
    expect(result.transactionReference).toBe("ONE-TRX-1");
  });
});
