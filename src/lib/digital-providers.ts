import { convertFromUsd, type CurrencyCode, getZwgPerUsdRate } from "@/lib/currency";
import type { PaymentMethod } from "@/lib/payment-methods";
import {
  type EgressPaymentPayload,
  EgressGatewayError,
  egressPostPayment,
  egressValidateCustomerAccount,
} from "@/lib/payments/egress";
import { env } from "@/lib/env";
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
import { getDstvAddOnPackage, getDstvPrimaryPackage } from "@/lib/dstv-packages";
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
  receiptDetails?: Record<string, unknown> & {
    receiptCurrencyCode?: CurrencyCode;
    receiptDate?: string;
    receiptTime?: string;
    meterNumber?: string;
    customerName?: string;
    customerAddress?: string;
    tariffName?: string;
    tokens?: string[];
    tenderAmount?: number;
    energyCharge?: number;
    debtCollected?: number;
    levyPercent?: number;
    levyAmount?: number;
    vatPercent?: number;
    vatAmount?: number;
    totalPaid?: number;
    totalTendered?: number;
  };
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

function mapCurrencyCode(currencyCode: CurrencyCode) {
  return currencyCode === "924" ? "ZWG" : "USD";
}

function mapProviderCurrencyToCode(providerCurrency: string | undefined, fallback: CurrencyCode): CurrencyCode {
  const normalized = providerCurrency?.trim().toUpperCase();
  if (normalized === "USD") {
    return "840";
  }
  if (normalized === "ZWG" || normalized === "ZIG") {
    return "924";
  }
  return fallback;
}

function getReceiptCurrencyFromParts(parts: string[]) {
  return parts.find(part => {
    const normalized = part.trim().toUpperCase();
    return normalized === "USD" || normalized === "ZWG" || normalized === "ZIG";
  });
}

function currentDateString() {
  return new Date().toISOString().slice(0, 10);
}

function currentDateTimeString() {
  return new Date().toISOString().slice(0, 19);
}

function currentEffectiveDateString() {
  const date = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function amountToEgressMinorUnits(amountUsd: number, currencyCode: CurrencyCode) {
  const amountInCustomerCurrency = convertFromUsd(amountUsd, currencyCode, getZwgPerUsdRate());
  return Math.round(amountInCustomerCurrency * 100);
}

function requireMeta(serviceMeta: Record<string, string> | undefined, key: string, label: string) {
  const value = serviceMeta?.[key]?.trim();
  if (!value) {
    throw new DigitalProviderUnavailableError(`${label} is required for this service.`, 400);
  }
  return value;
}

function buildDstvPaymentFields(serviceMeta: Record<string, string> | undefined) {
  const paymentType = serviceMeta?.paymentType?.trim().toUpperCase() || "BOUQUET";

  if (paymentType === "TOPUP") {
    return {
      customerPaymentDetails3: "TOPUP",
    };
  }

  if (paymentType !== "BOUQUET") {
    throw new DigitalProviderUnavailableError("DSTV payment type must be BOUQUET or TOPUP.", 400);
  }

  const bouquetCode = requireMeta(serviceMeta, "bouquet", "DSTV bouquet package");
  const bouquet = getDstvPrimaryPackage(bouquetCode);
  if (!bouquet) {
    throw new DigitalProviderUnavailableError(`Unsupported DSTV bouquet package code: ${bouquetCode}.`, 400);
  }

  const months = requireMeta(serviceMeta, "months", "Number of months");
  const parsedMonths = Number(months);
  if (!Number.isInteger(parsedMonths) || parsedMonths < 1) {
    throw new DigitalProviderUnavailableError("Number of months must be a whole number greater than zero.", 400);
  }

  const addOnCode = serviceMeta?.addon?.trim() || serviceMeta?.addons?.trim() || "None";
  const addOn = getDstvAddOnPackage(addOnCode);
  if (!addOn) {
    throw new DigitalProviderUnavailableError(`Unsupported DSTV add-on package code: ${addOnCode}.`, 400);
  }

  return {
    customerPaymentDetails1: bouquet.code,
    customerPaymentDetails2: addOn.code === "None" ? undefined : addOn.code,
    customerPaymentDetails3: `BOUQUET|${parsedMonths}`,
  };
}

function parseDelimitedResponse(responseDetails: string | undefined) {
  return (responseDetails ?? "").split("|").map(part => part.trim());
}

function parseDstvValidationDetails(responseDetails: string | undefined) {
  const parts = parseDelimitedResponse(responseDetails);
  const parsed: Record<string, string | undefined> = {};

  for (let index = 0; index < parts.length; index += 1) {
    const current = parts[index];
    const normalized = current.replace(/\s+/g, " ").trim().toLowerCase();
    const inlineMatch = current.match(/^([^:]+):\s*(.+)$/);

    if (inlineMatch) {
      parsed[inlineMatch[1].replace(/\s+/g, "").toLowerCase()] = inlineMatch[2].trim();
      continue;
    }

    if (normalized === "customer name") {
      parsed.customername = parts[index + 1];
    }
  }

  return {
    customerName: parsed.customername || parts[1],
    currency: parsed.currency,
    dueAmount: parseDstvDueAmount(parsed.dueamount),
    dueDate: parsed.duedate,
  };
}

function parseDstvDueAmount(value: string | undefined) {
  return value?.replace(/[^\d.-]/g, "");
}

function parseOptionalNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseZetdcMoney(value: string | undefined) {
  return parseOptionalNumber(value);
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

function parseZetdcReceiptDetails(receiptDetails: string | undefined, receiptCurrencyCode: CurrencyCode) {
  const parts = parseDelimitedResponse(receiptDetails);
  const resolvedReceiptCurrencyCode = mapProviderCurrencyToCode(getReceiptCurrencyFromParts(parts), receiptCurrencyCode);
  const receiptDate = parts[0];
  const receiptTime = parts[1];
  const meterNumber = parts[3];
  const customerName = parts[4];
  const receiptNumber = parts[2];
  const addressLines = parts.slice(5, 9).filter(Boolean);
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

  const unitCandidates = tokenIndex > 9
    ? [parts[tokenIndex - 2], parts[tokenIndex - 1], parts[tokenIndex + 1], defaultUnitsField]
    : tokenIndex >= 0
      ? [parts[tokenIndex + 2], parts[tokenIndex - 1], parts[tokenIndex - 2], parts[tokenIndex + 1], defaultUnitsField]
    : [defaultUnitsField];
  const parsedUnits = unitCandidates
    .map(candidate => (candidate ? Number(candidate) : Number.NaN))
    .find(candidate => Number.isFinite(candidate) && candidate > 0) ?? Number.NaN;
  const financialStartIndex = tokenIndex > 9 ? tokenIndex + 1 : 13;
  const parsedTenderAmount = tokenIndex > 9 ? parseZetdcMoney(parts[tokenIndex - 1]) : parseZetdcMoney(parts[12]);
  const parsedEnergyCharge = parseZetdcMoney(parts[financialStartIndex]);
  const parsedDebtCollected = parseZetdcMoney(parts[financialStartIndex + 1]);
  const parsedLevyAmount = parseZetdcMoney(parts[financialStartIndex + 3]);
  const parsedVatAmount = parseZetdcMoney(parts[financialStartIndex + 5]);
  const parsedTotalPaid = parseZetdcMoney(parts[financialStartIndex + 6]);

  return {
    parts,
    receiptCurrencyCode: resolvedReceiptCurrencyCode,
    receiptDate,
    receiptTime,
    meterNumber,
    customerName,
    customerAddress: addressLines.join(", ") || undefined,
    receiptNumber,
    tariffName: tokenIndex > 9 ? parts[tokenIndex - 3] : parts[10],
    tokens: normalizedTokens,
    token: normalizedTokens.length > 0 ? normalizedTokens.join("\n") : undefined,
    units: Number.isFinite(parsedUnits) ? parsedUnits : undefined,
    tenderAmount: parsedTenderAmount,
    energyCharge: parsedEnergyCharge,
    debtCollected: parsedDebtCollected,
    levyPercent: parseOptionalNumber(parts[financialStartIndex + 2]),
    levyAmount: parsedLevyAmount,
    vatPercent: parseOptionalNumber(parts[financialStartIndex + 4]),
    vatAmount: parsedVatAmount,
    totalPaid: parsedTotalPaid,
    totalTendered: parsedTotalPaid ?? parsedTenderAmount,
  };
}

function getStringField(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value);
}

function parseNyaradzoPaymentDetails3(value: string | undefined) {
  const parts = parseDelimitedResponse(value);
  return {
    transactionId: parts[0],
    paymentDate: parts[1],
    months: parts[2],
    policyNumber: parts[3],
    amount: parseOptionalNumber(parts[4]),
    currency: parts[5],
    customerName: parts[6],
    premiumAmount: parseOptionalNumber(parts[7]),
  };
}

function parseCimasValidationDetails(value: string | undefined) {
  const parts = parseDelimitedResponse(value);
  const [referenceFromName, ...nameParts] = (parts[0] ?? "").split("-");
  const customerName = nameParts.join("-").trim();

  return {
    referenceName: parts[0],
    referenceNumber: parts[1] || referenceFromName?.trim(),
    customerName: customerName || undefined,
    accountType: parts[2],
    currentProduct: parts[3],
    currency: parts[4],
    currentBalance: parseOptionalNumber(parts[5]),
  };
}

function parseNyaradzoReceiptDetails(input: {
  result: {
    successful: boolean;
    receiptNumber?: string;
    receiptDetails?: string;
    payment?: Record<string, unknown>;
  };
  request: EgressPaymentPayload;
}) {
  const payment = input.result.payment;
  const echoedDetails3 = getStringField(payment, "customerPaymentDetails3") ?? input.request.customerPaymentDetails3;
  const parsedDetails3 = parseNyaradzoPaymentDetails3(echoedDetails3);
  const customerAccount = getStringField(payment, "customerAccount") ?? input.request.customerAccount;
  const [policyNumberFromAccount, monthsFromAccount] = customerAccount.split("|").map(part => part.trim());
  const currency = getStringField(payment, "currency") ?? input.request.currency;
  const amount = parseOptionalNumber(getStringField(payment, "amount")) ?? input.request.amount;
  const customerName = getStringField(payment, "customerName") ?? input.request.customerName;
  const paymentDate = getStringField(payment, "paymentDate") ?? input.request.paymentDate;
  const status = getStringField(payment, "status") ?? (input.result.successful ? "Successful" : undefined);
  const narrative = getStringField(payment, "narrative") ?? input.result.receiptDetails;

  return {
    provider: "EGRESS",
    service: "Nyaradzo Group",
    successful: input.result.successful,
    receiptNumber: input.result.receiptNumber,
    receiptDetails: input.result.receiptDetails,
    gatewayReference: getStringField(payment, "gatewayReference") ?? input.request.gatewayReference,
    billerId: getStringField(payment, "billerId") ?? input.request.billerId,
    paymentReference: getStringField(payment, "paymentReference") ?? input.request.paymentReference,
    source: getStringField(payment, "source"),
    customerAccount,
    policyNumber: parsedDetails3.policyNumber || policyNumberFromAccount,
    months: parsedDetails3.months || monthsFromAccount,
    amount,
    currency,
    customerPaymentDetails1: getStringField(payment, "customerPaymentDetails1") ?? input.request.customerPaymentDetails1,
    customerPaymentDetails2: getStringField(payment, "customerPaymentDetails2") ?? input.request.customerPaymentDetails2,
    customerPaymentDetails3: echoedDetails3,
    customerPaymentDetails4: getStringField(payment, "customerPaymentDetails4") ?? input.request.customerPaymentDetails4,
    customerPaymentDetails5: getStringField(payment, "customerPaymentDetails5") ?? input.request.customerPaymentDetails5,
    customerMobile: getStringField(payment, "customerMobile") ?? input.request.customerMobile,
    customerPrimaryAccountNumber: getStringField(payment, "customerPrimaryAccountNumber") ?? input.request.customerPrimaryAccountNumber,
    paymentDate,
    status,
    narrative,
    customerName,
    paymentMethod: getStringField(payment, "paymentMethod") ?? input.request.paymentMethod,
    paymentType: getStringField(payment, "paymentType") ?? input.request.paymentType,
    details3: parsedDetails3,
  };
}

function parseCimasReceiptDetails(input: {
  result: {
    successful: boolean;
    receiptNumber?: string;
    receiptDetails?: string;
    payment?: Record<string, unknown>;
  };
  request: EgressPaymentPayload;
}) {
  const payment = input.result.payment;

  return {
    provider: "EGRESS",
    service: "CIMAS",
    successful: input.result.successful,
    receiptNumber: input.result.receiptNumber,
    receiptDetails: input.result.receiptDetails,
    gatewayReference: getStringField(payment, "gatewayReference") ?? input.request.gatewayReference,
    billerId: getStringField(payment, "billerId") ?? input.request.billerId,
    paymentReference: getStringField(payment, "paymentReference") ?? input.request.paymentReference,
    source: getStringField(payment, "source"),
    customerAccount: getStringField(payment, "customerAccount") ?? input.request.customerAccount,
    amount: parseOptionalNumber(getStringField(payment, "amount")) ?? input.request.amount,
    currency: getStringField(payment, "currency") ?? input.request.currency,
    customerPaymentDetails1: getStringField(payment, "customerPaymentDetails1") ?? input.request.customerPaymentDetails1,
    customerPaymentDetails2: getStringField(payment, "customerPaymentDetails2") ?? input.request.customerPaymentDetails2,
    customerPaymentDetails3: getStringField(payment, "customerPaymentDetails3") ?? input.request.customerPaymentDetails3,
    customerPaymentDetails4: getStringField(payment, "customerPaymentDetails4") ?? input.request.customerPaymentDetails4,
    customerPaymentDetails5: getStringField(payment, "customerPaymentDetails5") ?? input.request.customerPaymentDetails5,
    customerMobile: getStringField(payment, "customerMobile") ?? input.request.customerMobile,
    customerPrimaryAccountNumber: getStringField(payment, "customerPrimaryAccountNumber") ?? input.request.customerPrimaryAccountNumber,
    paymentDate: getStringField(payment, "paymentDate") ?? input.request.paymentDate,
    status: getStringField(payment, "status") ?? (input.result.successful ? "Successful" : undefined),
    narrative: getStringField(payment, "narrative") ?? input.result.receiptDetails,
    customerName: getStringField(payment, "customerName") ?? input.request.customerName,
    paymentMethod: getStringField(payment, "paymentMethod") ?? input.request.paymentMethod,
    paymentType: getStringField(payment, "paymentType") ?? input.request.paymentType,
  };
}

function parseCouncilReceiptDetails(input: {
  result: {
    successful: boolean;
    receiptNumber?: string;
    receiptDetails?: string;
    payment?: Record<string, unknown>;
  };
  request: EgressPaymentPayload;
}) {
  const payment = input.result.payment;

  return {
    provider: "EGRESS",
    service: "City of Harare",
    successful: input.result.successful,
    receiptNumber: input.result.receiptNumber,
    receiptDetails: input.result.receiptDetails,
    gatewayReference: getStringField(payment, "gatewayReference") ?? input.request.gatewayReference,
    billerId: getStringField(payment, "billerId") ?? input.request.billerId,
    paymentReference: getStringField(payment, "paymentReference") ?? input.request.paymentReference,
    source: getStringField(payment, "source"),
    customerAccount: getStringField(payment, "customerAccount") ?? input.request.customerAccount,
    amount: parseOptionalNumber(getStringField(payment, "amount")) ?? input.request.amount,
    currency: getStringField(payment, "currency") ?? input.request.currency,
    customerPaymentDetails1: getStringField(payment, "customerPaymentDetails1") ?? input.request.customerPaymentDetails1,
    customerPaymentDetails2: getStringField(payment, "customerPaymentDetails2") ?? input.request.customerPaymentDetails2,
    customerPaymentDetails3: getStringField(payment, "customerPaymentDetails3") ?? input.request.customerPaymentDetails3,
    customerPaymentDetails4: getStringField(payment, "customerPaymentDetails4") ?? input.request.customerPaymentDetails4,
    customerPaymentDetails5: getStringField(payment, "customerPaymentDetails5") ?? input.request.customerPaymentDetails5,
    customerMobile: getStringField(payment, "customerMobile") ?? input.request.customerMobile,
    customerPrimaryAccountNumber: getStringField(payment, "customerPrimaryAccountNumber") ?? input.request.customerPrimaryAccountNumber,
    paymentDate: getStringField(payment, "paymentDate") ?? input.request.paymentDate,
    status: getStringField(payment, "status") ?? (input.result.successful ? "Successful" : undefined),
    narrative: getStringField(payment, "narrative") ?? input.result.receiptDetails,
    customerName: getStringField(payment, "customerName") ?? input.request.customerName,
    paymentMethod: getStringField(payment, "paymentMethod") ?? input.request.paymentMethod,
    paymentType: getStringField(payment, "paymentType") ?? input.request.paymentType,
  };
}

function parseDstvReceiptDetails(input: {
  result: {
    successful: boolean;
    receiptNumber?: string;
    receiptDetails?: string;
    payment?: Record<string, unknown>;
  };
  request: EgressPaymentPayload;
}) {
  const payment = input.result.payment;
  const details3 = getStringField(payment, "customerPaymentDetails3") ?? input.request.customerPaymentDetails3;
  const isTopUp = details3?.trim().toUpperCase() === "TOPUP";
  const [paymentKind, months] = parseDelimitedResponse(details3);

  return {
    provider: "EGRESS",
    service: "DStv Payments",
    successful: input.result.successful,
    receiptNumber: input.result.receiptNumber,
    receiptDetails: input.result.receiptDetails,
    gatewayReference: getStringField(payment, "gatewayReference") ?? input.request.gatewayReference,
    billerId: getStringField(payment, "billerId") ?? input.request.billerId,
    paymentReference: getStringField(payment, "paymentReference") ?? input.request.paymentReference,
    customerAccount: getStringField(payment, "customerAccount") ?? input.request.customerAccount,
    amount: parseOptionalNumber(getStringField(payment, "amount")) ?? input.request.amount,
    currency: getStringField(payment, "currency") ?? input.request.currency,
    customerName: getStringField(payment, "customerName") ?? input.request.customerName,
    status: getStringField(payment, "status") ?? (input.result.successful ? "Successful" : undefined),
    narrative: getStringField(payment, "narrative") ?? input.result.receiptDetails,
    customerPaymentDetails1: getStringField(payment, "customerPaymentDetails1") ?? input.request.customerPaymentDetails1,
    customerPaymentDetails2: getStringField(payment, "customerPaymentDetails2") ?? input.request.customerPaymentDetails2,
    customerPaymentDetails3: details3,
    customerMobile: getStringField(payment, "customerMobile") ?? input.request.customerMobile,
    customerPrimaryAccountNumber: getStringField(payment, "customerPrimaryAccountNumber") ?? input.request.customerPrimaryAccountNumber,
    paymentDate: getStringField(payment, "paymentDate") ?? input.request.paymentDate,
    paymentMethod: getStringField(payment, "paymentMethod") ?? input.request.paymentMethod,
    paymentType: getStringField(payment, "paymentType") ?? input.request.paymentType,
    dstvPaymentType: isTopUp ? "TOPUP" : paymentKind,
    months: isTopUp ? undefined : months,
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

function buildNumericEgressPaymentReference(orderReference: string, gatewayReference?: string) {
  const orderDigits = orderReference.replace(/\D/g, "");
  if (orderDigits.length > 0) {
    return orderDigits.slice(0, 18);
  }

  return buildNumericEgressGatewayReference(orderReference, gatewayReference);
}

function buildValidationAccount(config: DigitalServiceConfig, accountNumber: string, serviceMeta?: Record<string, string>) {
  switch (config.id) {
    case "nyaradzo":
      return `${accountNumber}|${requireMeta(serviceMeta, "months", "Months to pay")}`;
    case "cimas": {
      const referenceType = requireMeta(serviceMeta, "referenceType", "Reference type").toUpperCase();
      if (referenceType !== "M" && referenceType !== "E") {
        throw new DigitalProviderUnavailableError("CIMAS reference type must be M for Member or E for Payer.", 400);
      }
      return `${referenceType}|${accountNumber}`;
    }
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
    case "cimas":
      return "CIMAS";
    case "councils":
      return "COH";
    default:
      throw new DigitalProviderUnavailableError(`${serviceId.toUpperCase()} is not configured for EGRESS.`, 501);
  }
}

function getEgressPaymentBillerId(serviceId: DigitalServiceId) {
  return getEgressBillerId(serviceId);
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
    case "dstv": {
      const parsedDstv = parseDstvValidationDetails(responseDetails);
      return {
        success: true,
        accountName: parsedDstv.customerName || "DStv Customer",
        accountNumber,
        billerName: "DSTV",
        raw: {
          ...raw,
          parsed: {
            customerName: parsedDstv.customerName,
            currency: parsedDstv.currency,
            dueAmount: parsedDstv.dueAmount,
            dueDate: parsedDstv.dueDate,
          },
        },
      };
    }
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
    case "cimas": {
      const parsedCimas = parseCimasValidationDetails(responseDetails);
      return {
        success: true,
        accountName: parsedCimas.customerName || "CIMAS Customer",
        accountNumber: parsedCimas.referenceNumber || accountNumber,
        billerName: "CIMAS",
        raw: {
          ...raw,
          parsed: parsedCimas,
        },
      };
    }
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
  const resolvedCurrencyCode = input.currencyCode ?? "840";
  const currency = config.id === "councils" ? "ZWL" : mapCurrencyCode(resolvedCurrencyCode);
  const amount = amountToEgressMinorUnits(input.amountUsd, resolvedCurrencyCode);
  const numericGatewayReference = buildNumericEgressGatewayReference(input.orderReference, input.gatewayReference);
  const base: EgressPaymentPayload = {
    gatewayReference: numericGatewayReference,
    billerId: getEgressPaymentBillerId(config.id),
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
      return {
        ...base,
        ...buildDstvPaymentFields(input.serviceMeta),
        customerPrimaryAccountNumber: input.serviceMeta?.customerPrimaryAccountNumber?.trim() || undefined,
        paymentDate: currentDateTimeString(),
        status: "PENDING",
        narrative: "dstv Bill Payment",
        paymentType: "BILLPAY",
      };
    }
    case "nyaradzo": {
      const months = requireMeta(input.serviceMeta, "months", "Months to pay");
      const numericPaymentReference = buildNumericEgressPaymentReference(input.orderReference, input.gatewayReference);
      return {
        ...base,
        paymentReference: numericPaymentReference,
        source: input.serviceMeta?.egressSource?.trim() || env.ZB_EGRESS_NYARADZO_SOURCE,
        paymentMethod: "cash",
        customerPaymentDetails3: [
          numericGatewayReference,
          currentDateString(),
          months,
          input.accountNumber,
          amount,
          currency,
          input.customerName,
          amount,
        ].join("|"),
      };
    }
    case "cimas": {
      const referenceType = requireMeta(input.serviceMeta, "referenceType", "Reference type").toUpperCase();
      if (referenceType !== "M" && referenceType !== "E") {
        throw new DigitalProviderUnavailableError("CIMAS reference type must be M for Member or E for Payer.", 400);
      }
      const numericPaymentReference = buildNumericEgressPaymentReference(input.orderReference, input.gatewayReference);
      return {
        ...base,
        paymentReference: numericPaymentReference,
        customerAccount: input.accountNumber,
        customerPaymentDetails1: currentEffectiveDateString(),
        customerPaymentDetails2: referenceType,
        customerPaymentDetails3: input.accountNumber,
        customerPaymentDetails4: `ref:${numericGatewayReference}`,
        paymentMethod: "CASH",
        paymentType: "CASH",
      };
    }
    case "councils":
      return {
        ...base,
        customerPaymentDetails1: "INTERNET",
        customerPaymentDetails2: "CASH",
        paymentMethod: "CASH",
        paymentType: "CASH",
      };
    case "zesa":
    default:
      return base;
  }
}

const smilePayEgressAdapter: DigitalProviderAdapter = {
  id: "smile-pay-egress",
  supports: ["zesa", "dstv", "nyaradzo", "cimas", "councils"],
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
      const paymentCurrencyCode = (input.serviceMeta?.currencyCode as CurrencyCode | undefined) ?? "840";
      const receiptCurrencyCode = mapProviderCurrencyToCode(input.serviceMeta?.accountCurrency, paymentCurrencyCode);
      const parsedZetdc = parseZetdcReceiptDetails(result.receiptDetails, receiptCurrencyCode);
      token = parsedZetdc.token;
      units = parsedZetdc.units;
      parsedReceipt = {
        receiptCurrencyCode: parsedZetdc.receiptCurrencyCode,
        receiptDate: parsedZetdc.receiptDate,
        receiptTime: parsedZetdc.receiptTime,
        meterNumber: parsedZetdc.meterNumber,
        customerName: parsedZetdc.customerName,
        customerAddress: parsedZetdc.customerAddress,
        receiptNumber: parsedZetdc.receiptNumber,
        tariffName: parsedZetdc.tariffName,
        tokens: parsedZetdc.tokens,
        units: parsedZetdc.units,
        tenderAmount: parsedZetdc.tenderAmount,
        energyCharge: parsedZetdc.energyCharge,
        debtCollected: parsedZetdc.debtCollected,
        levyPercent: parsedZetdc.levyPercent,
        levyAmount: parsedZetdc.levyAmount,
        vatPercent: parsedZetdc.vatPercent,
        vatAmount: parsedZetdc.vatAmount,
        totalPaid: parsedZetdc.totalPaid,
        totalTendered: parsedZetdc.totalTendered,
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
    } else if (config.id === "nyaradzo") {
      parsedReceipt = parseNyaradzoReceiptDetails({
        result,
        request: payment,
      });
    } else if (config.id === "cimas") {
      parsedReceipt = parseCimasReceiptDetails({
        result,
        request: payment,
      });
    } else if (config.id === "dstv") {
      parsedReceipt = parseDstvReceiptDetails({
        result,
        request: payment,
      });
    } else if (config.id === "councils") {
      parsedReceipt = parseCouncilReceiptDetails({
        result,
        request: payment,
      });
    }

    return {
      success: true,
      token,
      units,
      receiptNumber: result.receiptNumber,
      receiptDetails: parsedReceipt,
      message: config.id === "zesa" && parsedReceipt
        ? formatZetdcVendMessage(parsedReceipt as ReturnType<typeof parseZetdcReceiptDetails>)
        : parsedReceipt?.narrative && typeof parsedReceipt.narrative === "string"
          ? parsedReceipt.narrative
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
  supports: ["zesa", "dstv", "nyaradzo", "cimas", "councils"],
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
