import { beforeEach, describe, expect, it, vi } from "vitest";

const initiateSmilePayOrderPayment = vi.fn();
const egressValidateCustomerAccount = vi.fn();
const egressPostPayment = vi.fn();
const validateSmilePayUtility = vi.fn();
const vendSmilePayUtility = vi.fn();

vi.mock("@/lib/payments/smile-pay-service", () => ({
  initiateSmilePayOrderPayment,
}));

vi.mock("@/lib/payments/egress", () => ({
  EgressGatewayError: class EgressGatewayError extends Error {
    status: number;
    responseBody?: string;

    constructor(status: number, message: string, responseBody?: string) {
      super(message);
      this.name = "EgressGatewayError";
      this.status = status;
      this.responseBody = responseBody;
    }
  },
  egressValidateCustomerAccount,
  egressPostPayment,
}));

vi.mock("@/lib/payments/smile-pay", async () => {
  const actual = await vi.importActual<typeof import("@/lib/payments/smile-pay")>("@/lib/payments/smile-pay");
  return {
    ...actual,
    validateSmilePayUtility,
    vendSmilePayUtility,
  };
});

vi.mock("@/lib/currency", () => ({
  convertFromUsd: (amount: number) => amount,
  getZwgPerUsdRate: () => 1,
}));

vi.mock("@/lib/env", () => ({
  env: {},
}));

describe("digital provider purchase initiation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not inject a fallback payment url for WalletPlus express", async () => {
    initiateSmilePayOrderPayment.mockResolvedValue({
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

  it("uses the Smile Pay hosted checkout url for card payments", async () => {
    initiateSmilePayOrderPayment.mockResolvedValue({
      status: "PENDING",
      transactionReference: "CARD-TRX-1",
      paymentUrl: "https://checkout.example.com",
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
    initiateSmilePayOrderPayment.mockResolvedValue({
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

  it("uses EGRESS validation for ZESA meter lookups", async () => {
    egressValidateCustomerAccount.mockResolvedValue({
      successful: true,
      responseDetails: "12345678901|Test Customer|Address 1|Address 2|Harare|Province|USD",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.validateAccount("ZESA", "12345678901");

    expect(egressValidateCustomerAccount).toHaveBeenCalledWith({
      billerId: "ZETDC",
      customerAccount: "12345678901",
    });
    expect(result.accountName).toBe("Test Customer");
    expect(result.accountNumber).toBe("12345678901");
    expect(result.raw).toEqual(expect.objectContaining({
      parsed: expect.objectContaining({
        addressLines: ["Address 1", "Address 2", "Harare", "Province"],
        currency: "USD",
      }),
    }));
  });

  it("uses EGRESS validation for DStv smartcard lookups", async () => {
    egressValidateCustomerAccount.mockResolvedValue({
      successful: true,
      responseDetails: "1234567890|John Subscriber|Compact|Currency: USD|DueAmount: 45.00|DueDate: 2026-04-30",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.validateAccount("DSTV", "1234567890");

    expect(egressValidateCustomerAccount).toHaveBeenCalledWith({
      billerId: "DSTV",
      customerAccount: "1234567890",
    });
    expect(result).toEqual(expect.objectContaining({
      success: true,
      accountName: "John Subscriber",
      accountNumber: "1234567890",
      billerName: "DSTV",
    }));
    expect(result.raw).toEqual(expect.objectContaining({
      parsed: expect.objectContaining({
        customerName: "John Subscriber",
        currency: "USD",
        dueAmount: "45.00",
        dueDate: "2026-04-30",
      }),
    }));
  });

  it("falls dstv validation back to manual review when the provider fails", async () => {
    const { EgressGatewayError } = await import("@/lib/payments/egress");
    egressValidateCustomerAccount.mockRejectedValue(
      new EgressGatewayError(422, "Source not enabled for billerId: DSTV"),
    );

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.validateAccount("DSTV", "1234567890", {
      bouquet: "Compact",
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      accountNumber: "1234567890",
      billerName: "DStv Payments",
    }));
    expect(result.raw).toEqual(expect.objectContaining({
      mode: "manual_review",
      accountNumber: "1234567890",
      billerName: "DStv Payments",
      fallbackReason: "Source not enabled for billerId: DSTV",
    }));
  });

  it("falls councils validation back to manual review when the provider fails", async () => {
    const { EgressGatewayError } = await import("@/lib/payments/egress");
    egressValidateCustomerAccount.mockRejectedValue(
      new EgressGatewayError(422, "Source not enabled for billerId: COH"),
    );

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.validateAccount("COUNCILS", "COH-123456");

    expect(result).toEqual(expect.objectContaining({
      success: true,
      accountNumber: "COH-123456",
      billerName: "City of Harare",
    }));
    expect(result.raw).toEqual(expect.objectContaining({
      mode: "manual_review",
      accountNumber: "COH-123456",
      billerName: "City of Harare",
      fallbackReason: "Source not enabled for billerId: COH",
    }));
  });

  it("uses EGRESS validation for nyaradzo policy lookups when the provider responds", async () => {
    egressValidateCustomerAccount.mockResolvedValue({
      successful: true,
      responseDetails: "John Policy Holder|55.00|110.00|USD|2",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.validateAccount("NYARADZO", "POL-12345", {
      months: "2",
    });

    expect(egressValidateCustomerAccount).toHaveBeenCalledWith({
      billerId: "NYARADZO",
      customerAccount: "POL-12345|2",
    });
    expect(result).toEqual(expect.objectContaining({
      success: true,
      accountName: "John Policy Holder",
      accountNumber: "POL-12345",
      billerName: "NYARADZO",
    }));
    expect(result.raw).toEqual(expect.objectContaining({
      parsed: expect.objectContaining({
        policyHolder: "John Policy Holder",
        monthlyPremium: "55.00",
        amountToBePaid: "110.00",
        currency: "USD",
        numberOfMonths: "2",
      }),
    }));
  });

  it("falls nyaradzo validation back to manual review when the provider fails", async () => {
    const { EgressGatewayError } = await import("@/lib/payments/egress");
    egressValidateCustomerAccount.mockRejectedValue(
      new EgressGatewayError(422, "Source not enabled for billerId: NYARADZO"),
    );

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.validateAccount("NYARADZO", "POL-12345", {
      months: "2",
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      accountNumber: "POL-12345",
      billerName: "Nyaradzo Group",
    }));
    expect(result.raw).toEqual(expect.objectContaining({
      mode: "manual_review",
      accountNumber: "POL-12345",
      billerName: "Nyaradzo Group",
      fallbackReason: "Source not enabled for billerId: NYARADZO",
    }));
  });

  it("normalizes airtime requests into a manual-review validation snapshot", async () => {
    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.validateAccount("AIRTIME", "263771234567", {
      network: "Econet",
      productType: "Data",
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      accountName: "0771234567",
      accountNumber: "0771234567",
      billerName: "Econet Data",
    }));
    expect(result.raw).toEqual(expect.objectContaining({
      mode: "manual_review",
      network: "Econet",
      productType: "Data",
    }));
  });

  it("parses ZETDC vend responses from EGRESS receipt details", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "RCT-123",
      receiptDetails: "2026-04-17|10:00|RCT-123|12345678901|Test Customer|Address 1|Address 2|Harare|Province|1111 2222 3333 4444 # 5555 6666 7777 8888|Domestic|18.2|5.00|4.80|0|5|0.24|15|0.63|5.67|0|0|1|A|KRN",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.vendDigitalFulfilment("ZESA", {
      orderReference: "ORDER-1",
      gatewayReference: "BUHQ7542JPFD",
      accountNumber: "12345678901",
      amountUsd: 5,
      serviceMeta: {
        customerName: "Test Customer",
        customerMobile: "0771234567",
        currencyCode: "840",
      },
    });

    expect(egressPostPayment).toHaveBeenCalledWith(expect.objectContaining({
      billerId: "ZETDC",
      gatewayReference: expect.stringMatching(/^\d+$/),
      paymentReference: "ORDER-1",
      customerAccount: "12345678901",
      amount: 5,
      customerName: "Test Customer",
      customerMobile: "0771234567",
      currency: "USD",
    }));
    expect(result).toEqual(expect.objectContaining({
      success: true,
      receiptNumber: "RCT-123",
      token: "1111 2222 3333 4444\n5555 6666 7777 8888",
      units: 18.2,
      message: "Payment and vending successful. 2 electricity tokens issued.",
    }));
    expect(result.raw).toEqual(expect.objectContaining({
      parsedReceipt: expect.objectContaining({
        meterNumber: "12345678901",
        customerName: "Test Customer",
        tokens: ["1111 2222 3333 4444", "5555 6666 7777 8888"],
      }),
    }));
  });

  it("falls back to token-like fields when the ZETDC token is not in the documented slot", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "RCT-456",
      receiptDetails: "2026-04-17|10:00|RCT-456|12345678901|Test Customer|Address 1|Address 2|Harare|Province|Domestic|18.2|5.00|1111 2222 3333 4444 # 5555 6666 7777 8888|4.80|0|5|0.24|15|0.63|5.67|0|0|1|A|KRN",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.vendDigitalFulfilment("ZESA", {
      orderReference: "ORDER-2",
      gatewayReference: "BUHQ7542JPFE",
      accountNumber: "12345678901",
      amountUsd: 5,
      serviceMeta: {
        customerName: "Test Customer",
        customerMobile: "0771234567",
        currencyCode: "840",
      },
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      receiptNumber: "RCT-456",
      token: "1111 2222 3333 4444\n5555 6666 7777 8888",
      message: "Payment and vending successful. 2 electricity tokens issued.",
    }));
    expect(egressPostPayment).toHaveBeenCalledWith(expect.objectContaining({
      gatewayReference: expect.stringMatching(/^\d+$/),
      paymentReference: "ORDER-2",
    }));
  });

  it("posts DStv payments through the EGRESS adapter", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "DSTV-RCT-1",
      receiptDetails: "DStv payment accepted",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.vendDigitalFulfilment("DSTV", {
      orderReference: "DSTV-ORDER-1",
      gatewayReference: "ECVJ0513CMAZ",
      accountNumber: "1234567890",
      amountUsd: 45,
      serviceMeta: {
        customerName: "John Subscriber",
        customerMobile: "0771234567",
        currencyCode: "840",
        bouquet: "Compact",
        addons: "HDPVR|ASIAPK",
      },
    });

    expect(egressPostPayment).toHaveBeenCalledWith(expect.objectContaining({
      billerId: "DSTV",
      gatewayReference: expect.stringMatching(/^\d+$/),
      paymentReference: "DSTV-ORDER-1",
      customerAccount: "1234567890",
      amount: 45,
      customerName: "John Subscriber",
      customerMobile: "0771234567",
      currency: "USD",
      customerPaymentDetails1: "Compact",
      customerPaymentDetails2: "HDPVR|ASIAPK",
    }));
    expect(result).toEqual(expect.objectContaining({
      success: true,
      receiptNumber: "DSTV-RCT-1",
      message: "DStv payment accepted",
    }));
  });
});
