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
  env: {
    ZB_EGRESS_NYARADZO_SOURCE: "NYA-SOURCE",
  },
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

  it("uses a numeric checkout reference for DSTV payments", async () => {
    initiateSmilePayOrderPayment.mockResolvedValue({
      status: "PENDING",
      transactionReference: "DSTV-TRX-1",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.initiatePurchase({
      serviceType: "DSTV",
      accountNumber: "4117068963",
      amount: 10,
      paymentMethod: "WALLETPLUS",
      customerMobile: "263771234567",
      serviceMeta: {
        paymentType: "TOPUP",
      },
    }, "https://app.test");

    expect(result.reference).toMatch(/^\d{13}$/);
    expect(initiateSmilePayOrderPayment).toHaveBeenCalledWith(expect.objectContaining({
      reference: expect.stringMatching(/^\d{13}$/),
      returnUrl: expect.stringMatching(/reference=\d{13}/),
      cancelUrl: expect.stringMatching(/reference=\d{13}/),
      failureUrl: expect.stringMatching(/reference=\d{13}/),
    }));
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

  it("returns a customer-friendly message when ZETDC rejects a meter number", async () => {
    egressValidateCustomerAccount.mockResolvedValue({
      successful: false,
      responseDetails: "07088128645Kindly USe the Meter Numbers provided by the Developer",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    await expect(DigitalService.validateAccount("ZESA", "07088128645")).rejects.toMatchObject({
      status: 422,
      message: "We could not validate meter number 07088128645 with ZETDC. Please check the digits on the meter or token slip and try again.",
    });
  });

  it("uses EGRESS validation for DStv smartcard lookups", async () => {
    egressValidateCustomerAccount.mockResolvedValue({
      successful: true,
      responseDetails: "Customer Name | Mr . A ROSCOE| Currency : USD| Due Amount : 9.00| Due Date : 2026-04-21",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.validateAccount("DSTV", "4117068963");

    expect(egressValidateCustomerAccount).toHaveBeenCalledWith({
      billerId: "DSTV",
      customerAccount: "4117068963",
    });
    expect(result).toEqual(expect.objectContaining({
      success: true,
      accountName: "Mr . A ROSCOE",
      accountNumber: "4117068963",
      billerName: "DSTV",
    }));
    expect(result.raw).toEqual(expect.objectContaining({
      parsed: expect.objectContaining({
        customerName: "Mr . A ROSCOE",
        currency: "USD",
        dueAmount: "9.00",
        dueDate: "2026-04-21",
      }),
    }));
  });

  it("fails DStv validation without manual fallback when the provider fails", async () => {
    const { EgressGatewayError } = await import("@/lib/payments/egress");
    egressValidateCustomerAccount.mockRejectedValue(
      new EgressGatewayError(422, "Source not enabled for billerId: DSTV"),
    );

    const { DigitalService } = await import("@/lib/digital-service-logic");
    await expect(DigitalService.validateAccount("DSTV", "1234567890", {
      bouquet: "Compact",
    })).rejects.toThrow("Source not enabled for billerId: DSTV");
  });

  it("exposes the DSTV package and add-on catalog as selectable digital form fields", async () => {
    const { DIGITAL_SERVICES } = await import("@/lib/digital-services");
    const fields = DIGITAL_SERVICES.dstv.formFields ?? [];

    expect(fields.find(field => field.id === "paymentType")?.options).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: "BOUQUET" }),
      expect.objectContaining({ value: "TOPUP" }),
    ]));
    expect(fields.find(field => field.id === "bouquet")?.options).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: "COMPS20", label: expect.stringContaining("Compact") }),
      expect.objectContaining({ value: "COMPLS20", label: expect.stringContaining("Compact Plus") }),
      expect.objectContaining({ value: "ACSSS20", label: expect.stringContaining("Access") }),
      expect.objectContaining({ value: "PREMOTT", label: expect.stringContaining("Premium Streaming") }),
    ]));
    const addOnOptions = fields.find(field => field.id === "addon")?.options ?? [];
    expect(addOnOptions).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: "DUALS20", label: expect.stringContaining("Dual View") }),
      expect.objectContaining({ value: "MOVIESS20", label: expect.stringContaining("Movie Bundle") }),
      expect.objectContaining({ value: "None", label: expect.stringContaining("No Add-On") }),
    ]));
  });

  it("fails council validation without manual fallback when the provider fails", async () => {
    const { EgressGatewayError } = await import("@/lib/payments/egress");
    egressValidateCustomerAccount.mockRejectedValue(
      new EgressGatewayError(422, "Source not enabled for billerId: COH"),
    );

    const { DigitalService } = await import("@/lib/digital-service-logic");
    await expect(DigitalService.validateAccount("COUNCILS", "COH-123456"))
      .rejects.toThrow("Source not enabled for billerId: COH");
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

  it("fails Nyaradzo validation without manual fallback when the provider fails", async () => {
    const { EgressGatewayError } = await import("@/lib/payments/egress");
    egressValidateCustomerAccount.mockRejectedValue(
      new EgressGatewayError(422, "Source not enabled for billerId: NYARADZO"),
    );

    const { DigitalService } = await import("@/lib/digital-service-logic");
    await expect(DigitalService.validateAccount("NYARADZO", "POL-12345", {
      months: "2",
    })).rejects.toThrow("Source not enabled for billerId: NYARADZO");
  });

  it("rejects airtime validation while the service is unavailable", async () => {
    const { DigitalService } = await import("@/lib/digital-service-logic");
    await expect(DigitalService.validateAccount("AIRTIME", "263771234567", {
      network: "Econet",
      productType: "Data",
    })).rejects.toThrow("Airtime and data payments are temporarily unavailable.");
  });

  it("parses ZETDC vend responses from EGRESS receipt details", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "RCT-123",
      receiptDetails: "2026-04-17|10:00|RCT-123|12345678901|Test Customer|Address 1|Address 2|Harare|Province|1111 2222 3333 4444 # 5555 6666 7777 8888|Domestic|18.2|500|480|0|5|24|15|63|567|0|0|1|A|KRN",
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
        accountCurrency: "USD",
      },
    });

    expect(egressPostPayment).toHaveBeenCalledWith(expect.objectContaining({
      billerId: "ZETDC",
      gatewayReference: expect.stringMatching(/^\d{13}$/),
      paymentReference: "ORDER-1",
      customerAccount: "12345678901",
      amount: 500,
      customerName: "Test Customer",
      customerMobile: "0771234567",
      currency: "USD",
    }));
    expect(result).toEqual(expect.objectContaining({
      success: true,
      receiptNumber: "RCT-123",
      token: "1111 2222 3333 4444\n5555 6666 7777 8888",
      units: 18.2,
      receiptDetails: expect.objectContaining({
        receiptCurrencyCode: "840",
        receiptDate: "2026-04-17",
        receiptTime: "10:00",
        customerAddress: "Address 1, Address 2, Harare, Province",
        tariffName: "Domestic",
        tenderAmount: 500,
        energyCharge: 480,
        debtCollected: 0,
        levyPercent: 5,
        levyAmount: 24,
        vatPercent: 15,
        vatAmount: 63,
        totalPaid: 567,
      }),
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
      receiptDetails: "2026-04-17|10:00|RCT-456|12345678901|Test Customer|Address 1|Address 2|Harare|Province|Domestic|18.2|500|1111 2222 3333 4444 # 5555 6666 7777 8888|480|0|5|24|15|63|567|0|0|1|A|KRN",
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
        accountCurrency: "USD",
      },
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      receiptNumber: "RCT-456",
      token: "1111 2222 3333 4444\n5555 6666 7777 8888",
      units: 18.2,
      receiptDetails: expect.objectContaining({
        receiptCurrencyCode: "840",
        tariffName: "Domestic",
        tenderAmount: 500,
        energyCharge: 480,
        vatAmount: 63,
      }),
      message: "Payment and vending successful. 2 electricity tokens issued.",
    }));
    expect(egressPostPayment).toHaveBeenCalledWith(expect.objectContaining({
      gatewayReference: expect.stringMatching(/^\d{13}$/),
      paymentReference: "ORDER-2",
    }));
  });

  it("passes through real-like ZETDC receipt values as provided by EGRESS", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "POWER-RCT-1",
      receiptDetails: "25-04-2026|17:28:25|POWER-RCT-1|12345678961|Exavior Exavior|21 Natal|Avondale|Harare|USD|6730 9304 0536 5743 4902|Domestic|171.30|20000|943395|0|6|56604|0|0|20000|0|0|1|A|KRN",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.vendDigitalFulfilment("ZESA", {
      orderReference: "ORDER-MINOR",
      gatewayReference: "RKSS637101RE",
      accountNumber: "12345678961",
      amountUsd: 200,
      serviceMeta: {
        customerName: "Exavior Exavior",
        customerMobile: "0771234567",
        currencyCode: "924",
        accountCurrency: "USD",
      },
    });

    expect(result).toEqual(expect.objectContaining({
      success: true,
      receiptNumber: "POWER-RCT-1",
      units: 171.3,
      receiptDetails: expect.objectContaining({
        receiptCurrencyCode: "840",
        customerAddress: "21 Natal, Avondale, Harare, USD",
        tenderAmount: 20000,
        energyCharge: 943395,
        debtCollected: 0,
        levyPercent: 6,
        levyAmount: 56604,
        vatPercent: 0,
        vatAmount: 0,
        totalPaid: 20000,
      }),
    }));
  });

  it("passes through decimal-looking ZETDC receipt values as provided by EGRESS", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "POWER-RCT-2",
      receiptDetails: "25-04-2026|17:44:26|POWER-RCT-2|12345678961|Exavior Exavior|21 Natal|Avondale|Harare|USD|6730 9304 0536 5743 4902|Domestic|171.30|3000.00|943395.00|0.00|6|56604.00|0|0.00|3000.00|0|0|1|A|KRN",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.vendDigitalFulfilment("ZESA", {
      orderReference: "ORDER-DECIMAL-CENTS",
      gatewayReference: "VGHZ2614GVWP",
      accountNumber: "12345678961",
      amountUsd: 30,
      serviceMeta: {
        customerName: "Exavior Exavior",
        customerMobile: "0771234567",
        currencyCode: "840",
        accountCurrency: "USD",
      },
    });

    expect(result.receiptDetails).toEqual(expect.objectContaining({
      receiptCurrencyCode: "840",
      tenderAmount: 3000,
      energyCharge: 943395,
      debtCollected: 0,
      levyAmount: 56604,
      vatAmount: 0,
      totalPaid: 3000,
    }));
  });

  it("uses ZWG receipt currency while passing through EGRESS receipt values", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "POWER-RCT-3",
      receiptDetails: "27-04-2026|15:48:09|POWER-RCT-3|12345678964|Steve Jnr Doe|21 Natal|Avondale|Harare|ZWG|6730 9304 0536 5743 4902|Domestic|171.30|500|943395|0|6|56604|0|0|500|0|0|1|A|KRN",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.vendDigitalFulfilment("ZESA", {
      orderReference: "ORDER-ZWG-COMPONENTS",
      gatewayReference: "IYIY3143KFEE",
      accountNumber: "12345678964",
      amountUsd: 5,
      serviceMeta: {
        customerName: "Steve Jnr Doe",
        customerMobile: "0771234567",
        currencyCode: "840",
        accountCurrency: "USD",
      },
    });

    expect(result.receiptDetails).toEqual(expect.objectContaining({
      receiptCurrencyCode: "924",
      customerAddress: "21 Natal, Avondale, Harare, ZWG",
      tenderAmount: 500,
      energyCharge: 943395,
      debtCollected: 0,
      levyPercent: 6,
      levyAmount: 56604,
      vatAmount: 0,
      totalPaid: 500,
      totalTendered: 500,
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
      amountUsd: 92,
      serviceMeta: {
        customerName: "John Subscriber",
        customerMobile: "0771234567",
        currencyCode: "840",
        paymentType: "BOUQUET",
        bouquet: "COMPS20",
        addon: "DUALS20",
        months: "2",
        customerPrimaryAccountNumber: "0120240627378",
      },
    });

    expect(egressPostPayment).toHaveBeenCalledWith(expect.objectContaining({
      billerId: "DSTV",
      gatewayReference: expect.stringMatching(/^\d{13}$/),
      paymentReference: expect.stringMatching(/^\d{13}$/),
      customerAccount: "1234567890",
      amount: 9000,
      customerName: "John Subscriber",
      customerMobile: "0771234567",
      currency: "USD",
      customerPaymentDetails1: "COMPS20",
      customerPaymentDetails2: "DUALS20",
      customerPaymentDetails3: "BOUQUET|2",
      customerPrimaryAccountNumber: "0120240627378",
      status: "PENDING",
      narrative: "dstv Bill Payment",
      paymentMethod: "CASH",
      paymentType: "BILLPAY",
    }));
    expect(result).toEqual(expect.objectContaining({
      success: true,
      receiptNumber: "DSTV-RCT-1",
      message: "DStv payment accepted",
      receiptDetails: expect.objectContaining({
        service: "DStv Payments",
        dstvPaymentType: "BOUQUET",
        months: "2",
        customerPaymentDetails1: "COMPS20",
        customerPaymentDetails2: "DUALS20",
        customerPaymentDetails3: "BOUQUET|2",
      }),
    }));
  });

  it("excludes DSTV service charges from the EGRESS bouquet amount", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "DSTV-RCT-FEE",
      receiptDetails: "DStv payment accepted",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    await DigitalService.vendDigitalFulfilment("DSTV", {
      orderReference: "DSTV-ORDER-FEE",
      gatewayReference: "BQVZ2782TYHP",
      accountNumber: "4117068963",
      amountUsd: 27,
      serviceMeta: {
        customerName: "Mr A ROSCOE",
        customerMobile: "0711111111",
        currencyCode: "840",
        paymentType: "BOUQUET",
        bouquet: "LITES20",
        addon: "MOVIESS20",
        months: "1",
      },
    });

    expect(egressPostPayment).toHaveBeenCalledWith(expect.objectContaining({
      billerId: "DSTV",
      customerAccount: "4117068963",
      amount: 1500,
      currency: "USD",
      customerPaymentDetails1: "LITES20",
      customerPaymentDetails2: "MOVIESS20",
      customerPaymentDetails3: "BOUQUET|1",
    }));
  });

  it("posts DStv top-up payments with TOPUP in customerPaymentDetails3", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "2170477",
      receiptDetails: "Transaction Successful",
      payment: {
        gatewayReference: "11889",
        billerId: "DSTV",
        paymentReference: "59921006",
        customerAccount: "4117068963",
        amount: "1000.0",
        status: "Successful",
        narrative: "DSTV Payment Successful",
        currency: "USD",
        customerName: "Mr . A ROSCOE",
        customerPaymentDetails3: "TOPUP",
      },
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.vendDigitalFulfilment("DSTV", {
      orderReference: "DSTV-ORDER-2",
      gatewayReference: "ECVJ0513CMAZ",
      accountNumber: "4117068963",
      amountUsd: 10,
      serviceMeta: {
        customerName: "Mr . A ROSCOE",
        customerMobile: "0772000000",
        currencyCode: "840",
        paymentType: "TOPUP",
      },
    });

    expect(egressPostPayment).toHaveBeenCalledWith(expect.objectContaining({
      billerId: "DSTV",
      customerAccount: "4117068963",
      amount: 1000,
      customerPaymentDetails3: "TOPUP",
      narrative: "dstv Bill Payment",
      paymentType: "BILLPAY",
    }));
    expect(result).toEqual(expect.objectContaining({
      success: true,
      orderReference: "59921006",
      transactionReference: "11889",
      receiptNumber: "2170477",
      message: "DSTV Payment Successful",
      receiptDetails: expect.objectContaining({
        service: "DStv Payments",
        gatewayReference: "11889",
        paymentReference: "59921006",
        amount: 10,
        dstvPaymentType: "TOPUP",
        customerPaymentDetails3: "TOPUP",
      }),
    }));
  });

  it("treats DSTV resend/null response postPayment results as retryable provider unavailability", async () => {
    egressPostPayment.mockResolvedValue({
      successful: false,
      receiptDetails: "Service unavailable",
      payment: {
        gatewayReference: "12961",
        billerId: "DSTV",
        paymentReference: "0401572146129",
        customerAccount: "4117068963",
        amount: "200.0",
        customerPaymentDetails3: "TOPUP",
        status: "Resend",
        narrative: "Service unavailable - null response from ZSS",
        currency: "USD",
        customerName: "Mr A ROSCOE",
        paymentMethod: "CASH",
        paymentType: "BILLPAY",
      },
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    await expect(DigitalService.vendDigitalFulfilment("DSTV", {
      orderReference: "0401572146129",
      gatewayReference: "0401572146129",
      accountNumber: "4117068963",
      amountUsd: 2,
      serviceMeta: {
        customerName: "Mr A ROSCOE",
        customerMobile: "0711111111",
        currencyCode: "840",
        paymentType: "TOPUP",
      },
    })).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining("Service unavailable"),
    });
  });

  it("treats DSTV duplicate pending postPayment results as retryable provider unavailability", async () => {
    egressPostPayment.mockResolvedValue({
      successful: false,
      receiptDetails: "Duplicate transaction detected",
      payment: {
        gatewayReference: "406958361034",
        billerId: "DSTV",
        paymentReference: "0406958361034",
        customerAccount: "4117068963",
        amount: "3400.0",
        customerPaymentDetails1: "COFAMS20",
        customerPaymentDetails2: "DUALS20",
        customerPaymentDetails3: "BOUQUET|1",
        status: "PENDING",
        narrative: "dstv Bill Payment",
        currency: "USD",
        customerName: "Mr A ROSCOE",
        paymentMethod: "CASH",
        paymentType: "BILLPAY",
      },
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    await expect(DigitalService.vendDigitalFulfilment("DSTV", {
      orderReference: "0406958361034",
      gatewayReference: "0406958361034",
      accountNumber: "4117068963",
      amountUsd: 34,
      serviceMeta: {
        customerName: "Mr A ROSCOE",
        customerMobile: "0711111111",
        currencyCode: "840",
        paymentType: "BOUQUET",
        bouquet: "COFAMS20",
        addon: "DUALS20",
        months: "1",
      },
    })).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining("Duplicate transaction detected"),
    });
  });

  it("posts City of Harare EGRESS payments as ZWG-only cents with COH fields", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "BUS0006063",
      receiptDetails: "City of Harare Payment Successful",
      payment: {
        gatewayReference: "2240891",
        billerId: "COH",
        paymentReference: "ZB-2024438COH",
        source: "Provided Source",
        customerAccount: "BUS0006063",
        amount: "3000.0",
        customerPaymentDetails1: "INTERNET",
        customerPaymentDetails2: "CASH",
        paymentDate: "2024-02-08T00:00:00+02:00",
        status: "Successful",
        narrative: "City of Harare Payment Successful",
        currency: "USD",
        customerName: "MURINDAGOMO JACQUILINE T/A HONJACK TRADING CO.P/L",
        paymentMethod: "CASH",
        paymentType: "CASH",
      },
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.vendDigitalFulfilment("COUNCILS", {
      orderReference: "ZB-2024438COH",
      gatewayReference: "COH12345REF",
      accountNumber: "BUS0006063",
      amountUsd: 300,
      serviceMeta: {
        customerName: "MURINDAGOMO JACQUILINE T/A HONJACK TRADING CO.P/L",
        customerMobile: "0771234567",
        currencyCode: "924",
      },
    });

    expect(egressPostPayment).toHaveBeenCalledWith(expect.objectContaining({
      billerId: "COH",
      gatewayReference: expect.stringMatching(/^\d{13}$/),
      paymentReference: "ZB-2024438COH",
      customerAccount: "BUS0006063",
      amount: 30000,
      currency: "ZWL",
      customerPaymentDetails1: "INTERNET",
      customerPaymentDetails2: "CASH",
      paymentMethod: "CASH",
      paymentType: "CASH",
    }));
    expect(result).toEqual(expect.objectContaining({
      success: true,
      orderReference: "ZB-2024438COH",
      transactionReference: "2240891",
      receiptNumber: "BUS0006063",
      message: "City of Harare Payment Successful",
      receiptDetails: expect.objectContaining({
        service: "City of Harare",
        successful: true,
        receiptNumber: "BUS0006063",
        receiptDetails: "City of Harare Payment Successful",
        gatewayReference: "2240891",
        billerId: "COH",
        paymentReference: "ZB-2024438COH",
        customerAccount: "BUS0006063",
        amount: 30,
        currency: "USD",
        customerPaymentDetails1: "INTERNET",
        customerPaymentDetails2: "CASH",
        paymentDate: "2024-02-08T00:00:00+02:00",
        status: "Successful",
        narrative: "City of Harare Payment Successful",
        customerName: "MURINDAGOMO JACQUILINE T/A HONJACK TRADING CO.P/L",
        paymentMethod: "CASH",
        paymentType: "CASH",
      }),
    }));
  });

  it("posts Nyaradzo EGRESS amount fields in cents", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "NYA-RCT-1",
      receiptDetails: "Nyaradzo payment accepted",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    await DigitalService.vendDigitalFulfilment("NYARADZO", {
      orderReference: "NYA-ORDER-1",
      gatewayReference: "NYA12345REF",
      accountNumber: "POL-12345",
      amountUsd: 55,
      serviceMeta: {
        customerName: "John Policy Holder",
        customerMobile: "0771234567",
        currencyCode: "840",
        months: "2",
      },
    });

    expect(egressPostPayment).toHaveBeenCalledWith(expect.objectContaining({
      billerId: "NYARADZO",
      gatewayReference: expect.stringMatching(/^\d{13}$/),
      paymentReference: expect.stringMatching(/^\d{13}$/),
      source: "NYA-SOURCE",
      customerAccount: "POL-12345|2",
      amount: 5500,
      currency: "USD",
      paymentMethod: "cash",
      customerPaymentDetails3: expect.stringMatching(/^\d{13}\|\d{4}-\d{2}-\d{2}\|2\|POL-12345\|5500\|USD\|John Policy Holder\|5500$/),
    }));
  });

  it("maps Nyaradzo EGRESS vend response details for display", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "879664123",
      receiptDetails: "Transaction Proccessed Successfully",
      payment: {
        gatewayReference: "139452",
        billerId: "NY ARADZO",
        paymentReference: "879664123",
        source: "Provided Source",
        customerAccount: "SCPK551161|2",
        amount: "5000.0",
        customerPaymentDetails3: "78945612|2022-08-28|2|SCPK551161|5000|USD|Testerthree Tester|5000",
        customerMobile: "0775554554",
        paymentDate: "2022-08-28T00:00:00+02:00",
        status: "Successful",
        narrative: "Transaction Proccessed Successfully",
        currency: "USD",
        customerName: "Testerthree Tester",
        paymentMethod: "cash",
      },
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.vendDigitalFulfilment("NYARADZO", {
      orderReference: "879664123",
      gatewayReference: "154788654",
      accountNumber: "SCPK551161",
      amountUsd: 50,
      serviceMeta: {
        customerName: "Testerthree Tester",
        customerMobile: "0775554554",
        currencyCode: "840",
        months: "2",
      },
    });

    expect(result.receiptNumber).toBe("879664123");
    expect(result.orderReference).toBe("879664123");
    expect(result.transactionReference).toBe("139452");
    expect(result.message).toBe("Transaction Proccessed Successfully");
    expect(result.receiptDetails).toEqual(expect.objectContaining({
      service: "Nyaradzo Group",
      successful: true,
      receiptNumber: "879664123",
      receiptDetails: "Transaction Proccessed Successfully",
      gatewayReference: "139452",
      billerId: "NY ARADZO",
      paymentReference: "879664123",
      customerAccount: "SCPK551161|2",
      policyNumber: "SCPK551161",
      months: "2",
      amount: 50,
      currency: "USD",
      customerPaymentDetails3: "78945612|2022-08-28|2|SCPK551161|5000|USD|Testerthree Tester|5000",
      customerMobile: "0775554554",
      paymentDate: "2022-08-28T00:00:00+02:00",
      status: "Successful",
      narrative: "Transaction Proccessed Successfully",
      customerName: "Testerthree Tester",
      paymentMethod: "cash",
      details3: expect.objectContaining({
        transactionId: "78945612",
        paymentDate: "2022-08-28",
        months: "2",
        policyNumber: "SCPK551161",
        amount: 50,
        currency: "USD",
        customerName: "Testerthree Tester",
        premiumAmount: 50,
      }),
    }));
  });

  it("uses EGRESS validation for CIMAS member and payer references", async () => {
    egressValidateCustomerAccount.mockResolvedValue({
      successful: true,
      billerId: "CIMAS Medical Centre",
      customerAccount: "M|11445000",
      responseDetails: "11445000-MRS BANANA KIWI|11445000|PM|PRIVATE HOSPITAL|USD|565380",
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.validateAccount("CIMAS", "11445000", {
      referenceType: "M",
    });

    expect(egressValidateCustomerAccount).toHaveBeenCalledWith({
      billerId: "CIMAS",
      customerAccount: "M|11445000",
    });
    expect(result).toEqual(expect.objectContaining({
      success: true,
      accountName: "MRS BANANA KIWI",
      accountNumber: "11445000",
      billerName: "CIMAS",
      amountToBePaid: "565380",
      currency: "USD",
      raw: expect.objectContaining({
        parsed: expect.objectContaining({
          referenceName: "11445000-MRS BANANA KIWI",
          referenceNumber: "11445000",
          customerName: "MRS BANANA KIWI",
          accountType: "PM",
          currentProduct: "PRIVATE HOSPITAL",
          currency: "USD",
          currentBalance: 565380,
          amountToBePaid: "565380",
        }),
      }),
    }));
  });

  it("posts CIMAS payments with CIMAS-specific EGRESS fields", async () => {
    egressPostPayment.mockResolvedValue({
      successful: true,
      receiptNumber: "11445000",
      receiptDetails: "Cimas Payment Successful",
      payment: {
        gatewayReference: "2240134",
        billerId: "CIMAS",
        paymentReference: "2124435",
        source: "Provided Source",
        customerAccount: "11445000",
        amount: "7000000.0",
        customerPaymentDetails1: "04-Sep-23",
        customerPaymentDetails2: "M",
        customerPaymentDetails3: "11445000",
        customerPaymentDetails4: "ref:20467282",
        paymentDate: "2023-09-04T00:00:00+02:00",
        status: "Successful",
        narrative: "Cimas Payment Successful",
        currency: "RTGS",
        customerName: "MRS BANANA KIWI",
        paymentMethod: "CASH",
        paymentType: "CASH",
      },
    });

    const { DigitalService } = await import("@/lib/digital-service-logic");
    const result = await DigitalService.vendDigitalFulfilment("CIMAS", {
      orderReference: "CIMAS-ORDER-1",
      gatewayReference: "CIMAS-GW-20467282",
      accountNumber: "11445000",
      amountUsd: 30000,
      serviceMeta: {
        customerName: "MRS BANANA KIWI",
        customerMobile: "0771234567",
        currencyCode: "840",
        referenceType: "M",
      },
    });

    expect(egressPostPayment).toHaveBeenCalledWith(expect.objectContaining({
      billerId: "CIMAS",
      gatewayReference: expect.stringMatching(/^\d{13}$/),
      paymentReference: expect.stringMatching(/^\d{13}$/),
      customerAccount: "11445000",
      amount: 3000000,
      customerPaymentDetails1: expect.stringMatching(/^\d{2}-[A-Z][a-z]{2}-\d{2}$/),
      customerPaymentDetails2: "M",
      customerPaymentDetails3: "11445000",
      customerPaymentDetails4: expect.stringMatching(/^ref:\d{13}$/),
      paymentMethod: "CASH",
      paymentType: "CASH",
    }));
    expect(result).toEqual(expect.objectContaining({
      success: true,
      orderReference: "2124435",
      transactionReference: "2240134",
      receiptNumber: "2124435",
      message: "Cimas Payment Successful",
      receiptDetails: expect.objectContaining({
        service: "CIMAS",
        successful: true,
        receiptNumber: "11445000",
        receiptDetails: "Cimas Payment Successful",
        gatewayReference: "2240134",
        billerId: "CIMAS",
        paymentReference: "2124435",
        customerAccount: "11445000",
        amount: 70000,
        currency: "RTGS",
        customerPaymentDetails1: "04-Sep-23",
        customerPaymentDetails2: "M",
        customerPaymentDetails3: "11445000",
        customerPaymentDetails4: "ref:20467282",
        paymentDate: "2023-09-04T00:00:00+02:00",
        status: "Successful",
        narrative: "Cimas Payment Successful",
        customerName: "MRS BANANA KIWI",
        paymentMethod: "CASH",
        paymentType: "CASH",
      }),
    }));
  });
});
