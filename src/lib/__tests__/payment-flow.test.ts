import { describe, expect, it } from "vitest";
import { getPaymentProgressContent, resolvePurchaseFlowAction } from "@/lib/payment-flow";

describe("payment flow messaging", () => {
  it("treats awaiting payment as a customer approval state", () => {
    const result = getPaymentProgressContent("AWAITING_PAYMENT", {
      subject: "your payment",
    });

    expect(result.title).toBe("Waiting for confirmation");
    expect(result.description).toContain("Approve the prompt on your device");
  });

  it("routes redirect html responses into a 3D Secure handoff action", () => {
    expect(resolvePurchaseFlowAction({
      reference: "ORDER-3",
      status: "PENDING_3DS",
      redirectHtml: "<html></html>",
    })).toEqual({
      type: "html",
      html: "<html></html>",
    });
  });
});
