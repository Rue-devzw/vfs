import { beforeEach, describe, expect, it, vi } from "vitest";

describe("payment method configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SMILE_PAY_ENABLED_METHODS;
  });

  it("defaults to all payment methods when no allowlist is configured", async () => {
    const {
      getDefaultPaymentMethod,
      getEnabledPaymentMethodOptions,
    } = await import("@/lib/payment-methods");

    expect(getDefaultPaymentMethod()).toBe("WALLETPLUS");
    expect(getEnabledPaymentMethodOptions().map(option => option.id)).toEqual([
      "WALLETPLUS",
      "ECOCASH",
      "INNBUCKS",
      "OMARI",
      "ONEMONEY",
      "CARD",
    ]);
  });

  it("respects a Smile Pay allowlist while preserving the standard method order", async () => {
    process.env.NEXT_PUBLIC_SMILE_PAY_ENABLED_METHODS = "CARD,WALLETPLUS";

    const {
      getDefaultPaymentMethod,
      getEnabledPaymentMethodOptions,
    } = await import("@/lib/payment-methods");

    expect(getDefaultPaymentMethod()).toBe("WALLETPLUS");
    expect(getEnabledPaymentMethodOptions().map(option => option.id)).toEqual([
      "WALLETPLUS",
      "CARD",
    ]);
  });

  it("accepts card aliases from gateway-facing config labels", async () => {
    process.env.NEXT_PUBLIC_SMILE_PAY_ENABLED_METHODS = "WALLETPLUS,VISA/MASTERCARD";

    const { getEnabledPaymentMethodOptions } = await import("@/lib/payment-methods");

    expect(getEnabledPaymentMethodOptions().map(option => option.id)).toEqual([
      "WALLETPLUS",
      "CARD",
    ]);
  });
});
