import { convertFromUsd, type CurrencyCode, getZwgPerUsdRate } from "@/lib/currency";
import type { PaymentMethod } from "@/lib/payment-methods";
import {
  type EgressPaymentPayload,
  EgressGatewayError,
  egressPostPayment,
  egressValidateCustomerAccount,
} from "@/lib/payments/egress";
import {
  validateSmilePayUtility,
  vendSmilePayUtility,
} from "@/lib/payments/smile-pay";
import {
  DIGITAL_SERVICES,
  getDigitalServiceConfig,
  type DigitalServiceConfig,
  type DigitalServiceId,
} from "@/lib/digital-services";
import { initiateSmilePayOrderPayment } from "@/lib/payments/smile-pay-service";
import type { CardPaymentDetails } from "@/lib/payments/types";

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
  paymentMethod: PaymentMethod;
  currencyCode?: CurrencyCode;
  customerMobile?: string;
  cardDetails?: CardPaymentDetails;
  email?: string;
  serviceMeta?: Record<string, string>;
};

export type ProviderPurchaseResult = {
  reference: string;
  transactionReference?: string;
  status: string;
  paymentUrl?: string;
  redirectHtml?: string;
  authenticationStatus?: string;
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
    input: {
      orderReference: string;
      gatewayReference?: string;
      accountNumber: string;
      amountUsd: number;
      serviceMeta?: Record<string, string>;
    },
  ) => Promise<ProviderVendResult>;
};

function buildReference(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

async function initiateDigitalSmilePayPayment(
  config: DigitalServiceConfig,
  payload: ProviderPurchasePayload,
  baseUrl: string,
) {
  const reference = buildReference("digi");
  const currencyCode = payload.currencyCode ?? "840";
  const exchangeRate = getZwgPerUsdRate();
  const amount = convertFromUsd(payload.amount, currencyCode, exchangeRate);
  const encodedReference = encodeURIComponent(reference);
  const serviceReturnBase = `${baseUrl}/digital/${config.id}`;

  const response = await initiateSmilePayOrderPayment({
    reference,
    amount,
    currencyCode,
    paymentMethod: payload.paymentMethod,
    returnUrl: `${serviceReturnBase}?reference=${encodedReference}`,
    resultUrl: `${baseUrl}/api/payments/webhook/smile-pay`,
    cancelUrl: `${serviceReturnBase}?reference=${encodedReference}&status=CANCELED`,
    failureUrl: `${serviceReturnBase}?reference=${encodedReference}&status=FAILED`,
    itemName: `${config.label} Payment`,
    itemDescription: `${config.label} for ${payload.accountNumber}`,
    customerName: payload.serviceMeta?.customerName || "Digital Customer",
    customerEmail: payload.email,
    customerMobile: payload.customerMobile,
    cardDetails: payload.cardDetails,
  });

  return {
    reference,
    transactionReference: response.transactionReference,
    status: response.status ?? "PENDING",
    paymentUrl: response.paymentUrl,
    redirectHtml: response.redirectHtml,
    authenticationStatus: response.authenticationStatus,
    message: response.responseMessage || response.message,
    amount,
    currencyCode,
    exchangeRate,
    amountUsd: payload.amount,
  };
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

const smilePayManualBillsAdapter: DigitalProviderAdapter = {
  id: "smile-pay-manual-bills",
  supports: ["airtime", "internet"],
  async validateAccount(config, accountNumber, serviceMeta) {
    if (config.id === "airtime") {
      const normalizedMobile = normalizeZimbabweMobileNumber(accountNumber);
      const network = serviceMeta?.network?.trim() || inferZimbabweNetwork(normalizedMobile);
      const productType = serviceMeta?.productType?.trim() || "Airtime";
      const billerName = `${network} ${productType}`;

      return {
        success: true,
        accountName: normalizedMobile,
        accountNumber: normalizedMobile,
        billerName,
        raw: {
          mode: "manual_review",
          accountNumber: normalizedMobile,
          network,
          productType,
          billerName,
        },
      };
    }

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
    return initiateDigitalSmilePayPayment(config, payload, baseUrl);
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

function normalizeZimbabweMobileNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("263") && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return digits;
  }

  if (digits.length === 9 && digits.startsWith("7")) {
    return `0${digits}`;
  }

  throw new DigitalProviderUnavailableError("Enter a valid Zimbabwe mobile number for airtime purchases.", 400);
}

function inferZimbabweNetwork(normalizedMobile: string) {
  const prefix = normalizedMobile.slice(0, 3);

  switch (prefix) {
    case "077":
    case "078":
      return "Econet";
    case "071":
      return "NetOne";
    case "073":
      return "Telecel";
    default:
      return "Mobile";
  }
}

function isLikelyZetdcToken(value: string, excludedValues: string[]) {
  const normalized = value.trim();
  if (!normalized) return false;

  const compact = normalized.replace(/[\s#-]/g, "");
  if (!/^\d{16,}$/.test(compact)) {
    return false;
  }

  return !excludedValues.some(excluded => excluded && compact === excluded.replace(/\D/g, ""));
}

function extractLikelyZetdcTokens(parts: string[], excludedValues: string[]) {
  for (const [index, part] of parts.entries()) {
    if (!part) continue;

    if (part.includes("#")) {
      const tokens = part
        .split("#")
        .map(token => token.trim())
        .filter(token => isLikelyZetdcToken(token, excludedValues));
      if (tokens.length > 0) {
        return { tokens, index };
      }
    }

    if (isLikelyZetdcToken(part, excludedValues)) {
      return { tokens: [part.trim()], index };
    }
  }

  return { tokens: [], index: -1 };
}

function parseZetdcReceiptDetails(receiptDetails: string | undefined) {
  const parts = parseDelimitedResponse(receiptDetails);
  const meterNumber = parts[3];
  const customerName = parts[4];
  const receiptNumber = parts[2];
  const tokenField = parts[9];
  const defaultUnitsField = parts[11];

  const excludedValues = [meterNumber, receiptNumber];
  const tokensFromDefaultField = tokenField
    ? tokenField
        .split("#")
        .map(token => token.trim())
        .filter(token => isLikelyZetdcToken(token, excludedValues))
    : [];
  const fallbackTokenParse = extractLikelyZetdcTokens(parts, excludedValues);
  const normalizedTokens = tokensFromDefaultField.length > 0
    ? tokensFromDefaultField
    : fallbackTokenParse.tokens;
  const tokenIndex = tokensFromDefaultField.length > 0 ? 9 : fallbackTokenParse.index;

  const unitCandidates = tokenIndex >= 0
    ? [parts[tokenIndex - 1], parts[tokenIndex - 2], parts[tokenIndex + 1], defaultUnitsField]
    : [defaultUnitsField];
  const parsedUnits = unitCandidates
    .map(candidate => (candidate ? Number(candidate) : Number.NaN))
    .find(candidate => Number.isFinite(candidate) && candidate > 0) ?? Number.NaN;

  return {
    parts,
    meterNumber,
    customerName,
    receiptNumber,
    tokens: normalizedTokens,
    token: normalizedTokens.length > 0 ? normalizedTokens.join("\n") : undefined,
    units: Number.isFinite(parsedUnits) ? parsedUnits : undefined,
  };
}

function formatZetdcVendMessage(parsedReceipt: ReturnType<typeof parseZetdcReceiptDetails>) {
  const tokenCount = parsedReceipt.tokens.length;
  if (tokenCount > 1) {
    return `Payment and vending successful. ${tokenCount} electricity tokens issued.`;
  }
  if (tokenCount === 1) {
    return "Payment and vending successful. Your electricity token is ready.";
  }
  return "Payment successful. Token vending completed.";
}

function buildNumericEgressGatewayReference(orderReference: string, gatewayReference?: string) {
  const orderDigits = orderReference.replace(/\D/g, "");
  const gatewayDigits = (gatewayReference ?? "").replace(/\D/g, "");
  const combined = `${orderDigits}${gatewayDigits}`;

  if (combined.length > 0) {
    return combined.slice(0, 18);
  }

  return String(Date.now());
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
    case "zesa": {
      const parsedZesa = parseDelimitedResponse(responseDetails);
      return {
        success: true,
        accountName: parsedZesa[1] || "Verified Customer",
        accountNumber: parsedZesa[0] || accountNumber,
        billerName: parsedZesa.slice(2, 6).filter(Boolean).join(", ") || "ZETDC Prepaid",
        raw: {
          ...raw,
          parsed: {
            customerAccount: parsedZesa[0],
            customerName: parsedZesa[1],
            addressLines: parsedZesa.slice(2, 6),
            currency: parsedZesa[6],
          },
        },
      };
    }
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
  const numericGatewayReference = buildNumericEgressGatewayReference(input.orderReference, input.gatewayReference);
  const base: EgressPaymentPayload = {
    gatewayReference: numericGatewayReference,
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

const smilePayEgressAdapter: DigitalProviderAdapter = {
  id: "smile-pay-egress",
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
    return initiateDigitalSmilePayPayment(config, payload, baseUrl);
  },
  async vend(config, input) {
    const payment = buildEgressPaymentPayload(config, {
      orderReference: input.orderReference,
      accountNumber: input.accountNumber,
      amountUsd: input.amountUsd,
      gatewayReference: input.gatewayReference || input.orderReference,
      customerName: input.serviceMeta?.customerName || "Digital Customer",
      customerMobile: input.serviceMeta?.customerMobile,
      currencyCode: (input.serviceMeta?.currencyCode as CurrencyCode | undefined) ?? "840",
      serviceMeta: input.serviceMeta,
    });

    if (process.env.NODE_ENV !== "production" && config.id === "zesa") {
      console.info("[DEV ZESA] EGRESS postPayment request", {
        orderReference: input.orderReference,
        billerId: payment.billerId,
        smilePayGatewayReference: input.gatewayReference,
        egressGatewayReference: payment.gatewayReference,
        paymentReference: payment.paymentReference,
        customerAccount: payment.customerAccount,
        amount: payment.amount,
        currency: payment.currency,
        customerName: payment.customerName,
        customerMobile: payment.customerMobile,
      });
    }

    const result = await egressPostPayment(payment);
    if (!result.successful) {
      throw new EgressGatewayError(422, result.receiptDetails || `${config.label} fulfilment failed.`);
    }

    let token: string | undefined;
    let units: number | undefined;
    let parsedReceipt: Record<string, unknown> | undefined;
    if (config.id === "zesa") {
      const parsedZetdc = parseZetdcReceiptDetails(result.receiptDetails);
      token = parsedZetdc.token;
      units = parsedZetdc.units;
      parsedReceipt = {
        meterNumber: parsedZetdc.meterNumber,
        customerName: parsedZetdc.customerName,
        receiptNumber: parsedZetdc.receiptNumber,
        tokens: parsedZetdc.tokens,
        units: parsedZetdc.units,
      };

      if (process.env.NODE_ENV !== "production") {
        console.info("[DEV ZESA] EGRESS postPayment response", {
          orderReference: input.orderReference,
          successful: result.successful,
          receiptNumber: result.receiptNumber,
          receiptDetails: result.receiptDetails,
          parsedReceipt,
        });
      }
    }

    return {
      success: true,
      token,
      units,
      receiptNumber: result.receiptNumber,
      message: config.id === "zesa" && parsedReceipt
        ? formatZetdcVendMessage(parsedReceipt as ReturnType<typeof parseZetdcReceiptDetails>)
        : result.receiptDetails || `${config.label} posted successfully.`,
      raw: {
        ...result,
        ...(parsedReceipt ? { parsedReceipt } : {}),
      },
    };
  },
};

const smilePayUtilitiesAdapter: DigitalProviderAdapter = {
  id: "smile-pay-utilities",
  supports: ["zesa", "dstv", "nyaradzo", "councils"],
  async validateAccount(config, accountNumber) {
    const result = await validateSmilePayUtility({
      billerCode: getEgressBillerId(config.id),
      accountNumber,
    });

    if (!result.success) {
      throw new DigitalProviderUnavailableError(result.error || `${config.label} validation failed.`, 422);
    }

    return {
      success: true,
      accountName: result.accountName || "Verified Customer",
      accountNumber: result.accountNumber || accountNumber,
      billerName: config.label,
      raw: result as unknown as Record<string, unknown>,
    };
  },
  async initiatePurchase(config, payload, baseUrl) {
    return initiateDigitalSmilePayPayment(config, payload, baseUrl);
  },
  async vend(config, input) {
    const result = await vendSmilePayUtility({
      billerCode: getEgressBillerId(config.id),
      accountNumber: input.accountNumber,
      amount: input.amountUsd,
      transactionReference: input.orderReference,
    });

    if (!result.success) {
      throw new DigitalProviderUnavailableError(result.error || `${config.label} fulfilment failed.`, 422);
    }

    return {
      success: true,
      token: result.token,
      units: result.units,
      receiptNumber: result.receiptNumber,
      message: `${config.label} posted successfully.`,
      raw: result as unknown as Record<string, unknown>,
    };
  },
};

const ADAPTERS: Record<string, DigitalProviderAdapter> = {
  "unavailable": unavailableAdapter,
  "smile-pay-manual-bills": smilePayManualBillsAdapter,
  "smile-pay-egress": smilePayEgressAdapter,
  "smile-pay-utilities": smilePayUtilitiesAdapter,
};

export function getDigitalProviderAdapter(serviceType: string) {
  const config = getDigitalServiceConfig(serviceType.toLowerCase());
  if (!config) return null;
  const adapter = ADAPTERS[config.provider];
  if (!adapter) return null;
  return { config, adapter };
}
