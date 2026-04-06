import { describe, expect, it } from "vitest";
import {
  buildReceiptMessage,
  isSuccessfulGatewayStatus,
  resolvePurchaseFlowAction,
  shouldContinueStatusPolling,
} from "../flow-utils";

describe("zesa flow utils", () => {
  it("routes OTP responses into the OTP step", () => {
    expect(resolvePurchaseFlowAction({
      reference: "ORDER-1",
      transactionReference: "TRX-1",
      status: "AWAITING_OTP",
    })).toEqual({ type: "otp" });
  });

  it("routes redirect-based responses into the gateway page", () => {
    expect(resolvePurchaseFlowAction({
      reference: "ORDER-2",
      transactionReference: "TRX-2",
      status: "PENDING",
      paymentUrl: "https://pay.example.com",
    })).toEqual({ type: "redirect", url: "https://pay.example.com" });
  });

  it("keeps polling after PAID until vending data exists", () => {
    expect(shouldContinueStatusPolling("PAID", false)).toBe(true);
    expect(shouldContinueStatusPolling("PAID", true)).toBe(false);
    expect(isSuccessfulGatewayStatus("SUCCESS")).toBe(true);
    expect(buildReceiptMessage("SUCCESS", false)).toBe("Payment successful. Token vending may be delayed.");
  });
});
