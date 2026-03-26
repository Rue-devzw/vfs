import {
  initiateZbStandardCheckout,
  initiateEcocashExpress,
  initiateInnbucksExpress,
  initiateOmariExpress,
  initiateSmileCashExpress,
} from "@/lib/payments/zb";
import { convertFromUsd, type CurrencyCode, getZwgPerUsdRate } from "@/lib/currency";
import { env } from "@/lib/env";
import {
  type EgressPaymentPayload,
  EgressGatewayError,
  egressPostPayment,
  egressValidateCustomerAccount,
} from "@/lib/payments/egress";
import {
  DIGITAL_SERVICES,
  getDigitalServiceConfig,
  type DigitalServiceConfig,
  type DigitalServiceId,
} from "@/lib/digital-services";

export type ProviderValidationResult = {
  success: boolean;
  accountName?: string;
  accountNumber: string;
  billerName?: string;
  raw?: Record<string, unknown>;
};

export type ProviderPurchasePayload = {
  serviceType: Uppercase<DigitalServiceId>;
  accountNumber: string;
  amount: number;
  paymentMethod: "WALLETPLUS" | "ECOCASH" | "INNBUCKS" | "OMARI" | "CARD";
  currencyCode?: CurrencyCode;
  customerMobile?: string;
  email?: string;
  serviceMeta?: Record<string, string>;
};

export type ProviderPurchaseResult = {
  reference: string;
  transactionReference?: string;
  status: string;
  paymentUrl?: string;
  message?: string;
  amount: number;
  currencyCode: CurrencyCode;
  exchangeRate: number;
  amountUsd: number;
};

export type ProviderVendResult = {
  success: boolean;
  token?: string;
  units?: number;
  receiptNumber?: string;
  message?: string;
  raw?: Record<string, unknown>;
};

export class DigitalProviderUnavailableError extends Error {
  readonly status: number;

  constructor(message: string, status = 501) {
    super(message);
    this.name = "DigitalProviderUnavailableError";
    this.status = status;
  }
}

export type DigitalProviderAdapter = {
  id: string;
  supports: DigitalServiceId[];
  validateAccount: (
    config: DigitalServiceConfig,
    accountNumber: string,
    serviceMeta?: Record<string, string>,
  ) => Promise<ProviderValidationResult>;
  initiatePurchase: (config: DigitalServiceConfig, payload: ProviderPurchasePayload, baseUrl: string) => Promise<ProviderPurchaseResult>;
  vend?: (
    config: DigitalServiceConfig,
    input: { orderReference: string; accountNumber: string; amountUsd: number; serviceMeta?: Record<string, string> },
  ) => Promise<ProviderVendResult>;
};

function buildReference(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

const unavailableAdapter: DigitalProviderAdapter = {
  id: "unavailable",
  supports: Object.keys(DIGITAL_SERVICES).filter(key => key !== "zesa") as DigitalServiceId[],
  async validateAccount(config) {
    throw new DigitalProviderUnavailableError(
      config.supportMessage || `${config.label} validation is not available yet.`,
    );
  },
  async initiatePurchase(config) {
    throw new DigitalProviderUnavailableError(
      config.supportMessage || `${config.label} payments are not available yet.`,
    );
  },
};

const zbManualBillsAdapter: DigitalProviderAdapter = {
  id: "zb-manual-bills",
  supports: ["airtime", "internet"],
  async validateAccount(config, accountNumber) {
    return {
      success: true,
      accountName: "Manual verification pending",
      accountNumber,
      billerName: config.label,
      raw: {
        mode: "manual_review",
        accountNumber,
        billerName: config.label,
      },
    };
  },
  async initiatePurchase(config, payload, baseUrl) {
    const reference = buildReference("digi");
    const currencyCode = payload.currencyCode ?? "840";
    const exchangeRate = getZwgPerUsdRate();
    const amount = convertFromUsd(payload.amount, currencyCode, exchangeRate);
    const encodedReference = encodeURIComponent(reference);
    const serviceReturnBase = `${baseUrl}/digital/${config.id}`;

    const zbPayload = {
      orderReference: reference,
      amount,
      returnUrl: `${serviceReturnBase}?reference=${encodedReference}`,
      resultUrl: `${baseUrl}/api/zb/webhook`,
      cancelUrl: `${serviceReturnBase}?reference=${encodedReference}&status=CANCELED`,
      failureUrl: `${serviceReturnBase}?reference=${encodedReference}&status=FAILED`,
      itemName: `${config.label} Payment`,
      itemDescription: `${config.label} for ${payload.accountNumber}`,
      currencyCode,
      email: payload.email,
      customerMobile: payload.customerMobile,
    };

    let response;
    if (payload.paymentMethod === "CARD") {
      response = await initiateZbStandardCheckout(zbPayload);
    } else {
      if (!payload.customerMobile) throw new Error(`${payload.paymentMethod} requires a mobile number.`);
      switch (payload.paymentMethod) {
        case "ECOCASH": response = await initiateEcocashExpress(zbPayload); break;
        case "INNBUCKS": response = await initiateInnbucksExpress(zbPayload); break;
        case "OMARI": response = await initiateOmariExpress(zbPayload); break;
        case "WALLETPLUS": response = await initiateSmileCashExpress(zbPayload); break;
        default: throw new Error(`Unsupported payment method: ${payload.paymentMethod}`);
      }
    }

    return {
      reference,
      transactionReference: response.transactionReference,
      status: response.status ?? "PENDING",
      paymentUrl: response.paymentUrl || env.ZB_DIGITAL_CHECKOUT_URL,
      message: response.responseMessage || "Payment initiated. Your request will be reviewed after payment confirmation.",
      amount,
      currencyCode,
      exchangeRate,
      amountUsd: payload.amount,
    };
  },
};

function mapCurrencyCode(currencyCode: CurrencyCode) {
  return currencyCode === "924" ? "ZWG" : "USD";
}

function currentDateString() {
  return new Date().toISOString().slice(0, 10);
}

function amountToEgressValue(serviceId: DigitalServiceId, amountUsd: number) {
  if (serviceId === "councils") {
    return Math.round(amountUsd * 100);
  }
  return amountUsd;
}

function requireMeta(serviceMeta: Record<string, string> | undefined, key: string, label: string) {
  const value = serviceMeta?.[key]?.trim();
  if (!value) {
    throw new DigitalProviderUnavailableError(`${label} is required for this service.`, 400);
  }
  return value;
}

function parseDelimitedResponse(responseDetails: string | undefined) {
  return (responseDetails ?? "").split("|").map(part => part.trim());
}

function buildValidationAccount(config: DigitalServiceConfig, accountNumber: string, serviceMeta?: Record<string, string>) {
  switch (config.id) {
    case "nyaradzo":
      return `${accountNumber}|${requireMeta(serviceMeta, "months", "Months to pay")}`;
    case "zesa":
    case "dstv":
    case "councils":
    default:
      return accountNumber;
  }
}

function getEgressBillerId(serviceId: DigitalServiceId) {
  switch (serviceId) {
    case "zesa":
      return "ZETDC";
    case "dstv":
      return "DSTV";
    case "nyaradzo":
      return "NYARADZO";
    case "councils":
      return "COH";
    default:
      throw new DigitalProviderUnavailableError(`${serviceId.toUpperCase()} is not configured for EGRESS.`, 501);
  }
}

function mapValidationResponse(
  config: DigitalServiceConfig,
  accountNumber: string,
  responseDetails: string | undefined,
  raw: Record<string, unknown>,
): ProviderValidationResult {
  const parts = parseDelimitedResponse(responseDetails);

  switch (config.id) {
    case "zesa":
      return {
        success: true,
        accountName: parts[1] || "Verified Customer",
        accountNumber: parts[0] || accountNumber,
        billerName: parts.slice(2, 6).filter(Boolean).join(", ") || "ZETDC Prepaid",
        raw: {
          ...raw,
          parsed: {
            customerAccount: parts[0],
            customerName: parts[1],
            addressLines: parts.slice(2, 6),
            currency: parts[6],
          },
        },
      };
    case "dstv":
      return {
        success: true,
        accountName: parts[1] || "DStv Customer",
        accountNumber,
        billerName: "DSTV",
        raw: {
          ...raw,
          parsed: {
            customerName: parts[1],
            currency: parts[3]?.replace(/^Currency:\s*/i, ""),
            dueAmount: parts[4]?.replace(/^DueAmount:\s*/i, ""),
            dueDate: parts[5]?.replace(/^DueDate:\s*/i, ""),
          },
        },
      };
    case "nyaradzo":
      return {
        success: true,
        accountName: parts[0] || "Policy Holder",
        accountNumber,
        billerName: "NYARADZO",
        raw: {
          ...raw,
          parsed: {
            policyHolder: parts[0],
            monthlyPremium: parts[1],
            amountToBePaid: parts[2],
            currency: parts[3],
            numberOfMonths: parts[4],
          },
        },
      };
    case "councils":
      return {
        success: true,
        accountName: parts[1] || "City of Harare Account",
        accountNumber,
        billerName: "City of Harare",
        raw: {
          ...raw,
          parsed: {
            internalReference: parts[0],
            accountName: parts[1],
          },
        },
      };
    default:
      return {
        success: true,
        accountName: "Verified Customer",
        accountNumber,
        billerName: config.label,
        raw,
      };
  }
}

function buildEgressPaymentPayload(config: DigitalServiceConfig, input: {
  orderReference: string;
  accountNumber: string;
  amountUsd: number;
  gatewayReference: string;
  customerName: string;
  customerMobile?: string;
  currencyCode?: CurrencyCode;
  serviceMeta?: Record<string, string>;
}) {
  const currency = mapCurrencyCode(input.currencyCode ?? "840");
  const amount = amountToEgressValue(config.id, input.amountUsd);
  const base: EgressPaymentPayload = {
    gatewayReference: input.gatewayReference,
    billerId: getEgressBillerId(config.id),
    paymentReference: input.orderReference,
    customerAccount: buildValidationAccount(config, input.accountNumber, input.serviceMeta),
    amount,
    customerMobile: input.customerMobile,
    paymentDate: currentDateString(),
    currency,
    customerName: input.customerName,
    paymentMethod: "CASH",
    paymentType: "CASH",
  };

  switch (config.id) {
    case "dstv": {
      const bouquet = requireMeta(input.serviceMeta, "bouquet", "Bouquet");
      return {
        ...base,
        customerPaymentDetails1: bouquet,
        customerPaymentDetails2: input.serviceMeta?.addons?.trim() || undefined,
      };
    }
    case "nyaradzo": {
      const months = requireMeta(input.serviceMeta, "months", "Months to pay");
      return {
        ...base,
        customerPaymentDetails3: [
          input.customerMobile || "",
          currentDateString(),
          months,
          input.accountNumber,
          input.amountUsd,
          currency,
          input.customerName,
          input.amountUsd,
        ].join("|"),
      };
    }
    case "councils":
      return {
        ...base,
        customerPaymentDetails1: "INTERNET",
        customerPaymentDetails2: "CASH",
      };
    case "zesa":
    default:
      return base;
  }
}

const zbEgressAdapter: DigitalProviderAdapter = {
  id: "zb-egress",
  supports: ["zesa", "dstv", "nyaradzo", "councils"],
  async validateAccount(config, accountNumber, serviceMeta) {
    const customerAccount = buildValidationAccount(config, accountNumber, serviceMeta);
    const result = await egressValidateCustomerAccount({
      billerId: getEgressBillerId(config.id),
      customerAccount,
    });

    if (!result.successful) {
      throw new EgressGatewayError(422, result.responseDetails || `${config.label} validation failed.`);
    }

    return mapValidationResponse(config, accountNumber, result.responseDetails, result as Record<string, unknown>);
  },
  async initiatePurchase(config, payload, baseUrl) {
    const reference = buildReference("digi");
    const currencyCode = payload.currencyCode ?? "840";
    const exchangeRate = getZwgPerUsdRate();
    const amount = convertFromUsd(payload.amount, currencyCode, exchangeRate);
    const encodedReference = encodeURIComponent(reference);
    const serviceReturnBase = `${baseUrl}/digital/${config.id}`;

    const zbPayload = {
      orderReference: reference,
      amount,
      returnUrl: `${serviceReturnBase}?reference=${encodedReference}`,
      resultUrl: `${baseUrl}/api/zb/webhook`,
      cancelUrl: `${serviceReturnBase}?reference=${encodedReference}&status=CANCELED`,
      failureUrl: `${serviceReturnBase}?reference=${encodedReference}&status=FAILED`,
      itemName: `${config.label} Payment`,
      itemDescription: `${config.label} for ${payload.accountNumber}`,
      currencyCode,
      email: payload.email,
      customerMobile: payload.customerMobile,
    };

    let response;
    if (payload.paymentMethod === "CARD") {
      response = await initiateZbStandardCheckout(zbPayload);
    } else {
      if (!payload.customerMobile) throw new Error(`${payload.paymentMethod} requires a mobile number.`);
      switch (payload.paymentMethod) {
        case "ECOCASH": response = await initiateEcocashExpress(zbPayload); break;
        case "INNBUCKS": response = await initiateInnbucksExpress(zbPayload); break;
        case "OMARI": response = await initiateOmariExpress(zbPayload); break;
        case "WALLETPLUS": response = await initiateSmileCashExpress(zbPayload); break;
        default: throw new Error(`Unsupported payment method: ${payload.paymentMethod}`);
      }
    }
    const paymentUrl = response.paymentUrl || env.ZB_DIGITAL_CHECKOUT_URL;

    return {
      reference,
      transactionReference: response.transactionReference,
      status: response.status ?? "PENDING",
      paymentUrl,
      message: response.responseMessage,
      amount,
      currencyCode,
      exchangeRate,
      amountUsd: payload.amount,
    };
  },
  async vend(config, input) {
    const payment = buildEgressPaymentPayload(config, {
      orderReference: input.orderReference,
      accountNumber: input.accountNumber,
      amountUsd: input.amountUsd,
      gatewayReference: input.orderReference,
      customerName: input.serviceMeta?.customerName || "Digital Customer",
      customerMobile: input.serviceMeta?.customerMobile,
      currencyCode: (input.serviceMeta?.currencyCode as CurrencyCode | undefined) ?? "840",
      serviceMeta: input.serviceMeta,
    });
    const result = await egressPostPayment(payment);
    if (!result.successful) {
      throw new EgressGatewayError(422, result.receiptDetails || `${config.label} fulfilment failed.`);
    }

    let token: string | undefined;
    let units: number | undefined;
    if (config.id === "zesa") {
      const parts = parseDelimitedResponse(result.receiptDetails);
      const tokenField = parts[9];
      if (tokenField) {
        token = tokenField.split("#")[0]?.trim() || undefined;
      }
      const unitsField = parts[11];
      if (unitsField) {
        const parsedUnits = Number(unitsField);
        units = Number.isFinite(parsedUnits) ? parsedUnits : undefined;
      }
    }

    return {
      success: true,
      token,
      units,
      receiptNumber: result.receiptNumber,
      message: result.receiptDetails || `${config.label} posted successfully.`,
      raw: {
        ...result,
      },
    };
  },
};

const ADAPTERS: Record<string, DigitalProviderAdapter> = {
  "unavailable": unavailableAdapter,
  "zb-manual-bills": zbManualBillsAdapter,
  "zb-egress": zbEgressAdapter,
};

export function getDigitalProviderAdapter(serviceType: string) {
  const config = getDigitalServiceConfig(serviceType.toLowerCase());
  if (!config) return null;
  const adapter = ADAPTERS[config.provider];
  if (!adapter) return null;
  return { config, adapter };
}
