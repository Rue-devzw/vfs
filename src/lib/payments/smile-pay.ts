import crypto from "crypto";
import { env } from "@/lib/env";
import { getPaymentMethodLabel, type PaymentMethod } from "@/lib/payment-methods";
import type { CardPaymentDetails, SmilePayCardAuthResponse } from "./types";

export type SmilePayInitiatePayload = {
  orderReference: string;
  amount: number;
  returnUrl: string;
  resultUrl: string;
  itemName: string;
  itemDescription?: string;
  currencyCode?: string;
  firstName?: string;
  lastName?: string;
  mobilePhoneNumber?: string;
  email?: string;
  paymentMethod?: PaymentMethod;
  cancelUrl?: string;
  failureUrl?: string;
};

export type SmilePayExpressInitiatePayload = {
  orderReference: string;
  amount: number;
  returnUrl?: string;
  resultUrl: string;
  itemName: string;
  itemDescription: string;
  currencyCode: string;
  firstName?: string;
  lastName?: string;
  mobilePhoneNumber?: string;
  email?: string;
  customerMobile?: string;
  ecocashMobile?: string;
  innbucksMobile?: string;
  omariMobile?: string;
  oneMoneyMobile?: string;
  onemoneyMobile?: string;
  zbWalletMobile?: string;
  cancelUrl?: string;
  failureUrl?: string;
  paymentMethod?: PaymentMethod;
  pan?: string;
  expMonth?: string;
  expYear?: string;
  securityCode?: string;
};

export type SmilePayConfirmPayload = {
  otp: string;
  transactionReference: string;
  omariMobile?: string;
};

export type SmilePayInitiateResponse = {
  responseMessage?: string;
  responseCode?: string;
  paymentUrl?: string;
  transactionReference?: string;
  status?: string;
  message?: string;
  authenticationStatus?: string;
  redirectHtml?: string;
};

export type SmilePayStatusResponse = {
  merchantId?: string;
  reference?: string;
  orderReference?: string;
  itemName?: string;
  amount?: number;
  currency?: string;
  paymentOption?: string;
  status?: string;
  createdDate?: string;
  returnUrl?: string;
  resultUrl?: string;
  clientFee?: number;
  merchantFee?: number;
};

export type SmilePayUtilityValidationPayload = {
  billerCode: string;
  accountNumber: string;
};

export type SmilePayUtilityValidationResponse = {
  success: boolean;
  accountName?: string;
  accountNumber?: string;
  error?: string;
};

export type SmilePayUtilityVendPayload = {
  billerCode: string;
  accountNumber: string;
  amount: number;
  transactionReference: string;
};

export type SmilePayUtilityVendResponse = {
  success: boolean;
  token?: string;
  units?: number;
  receiptNumber?: string;
  amount?: number;
  error?: string;
};

type SmilePayConfig = {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  baseRoot: string;
  utilitiesBaseUrl: string;
  webhookSecret?: string;
};

export class SmilePayGatewayError extends Error {
  readonly status: number;
  readonly responseBody?: unknown;

  constructor(status: number, message: string, responseBody?: unknown) {
    super(message);
    this.name = "SmilePayGatewayError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

function getSmilePayConfig(): SmilePayConfig {
  const apiKey = env.SMILE_PAY_API_KEY || env.ZB_API_KEY;
  const apiSecret = env.SMILE_PAY_API_SECRET || env.ZB_API_SECRET;
  const rawBaseUrl = env.SMILE_PAY_API_BASE_URL
    || env.ZB_API_BASE_URL
    || (process.env.NODE_ENV === "production"
      ? "https://zbnet.zb.co.zw/wallet_gateway/payments-gateway"
      : "https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway");

  const baseRoot = rawBaseUrl.replace(/\/payments-gateway\/?$/, "");
  const utilitiesBaseUrl = env.SMILE_PAY_UTILITIES_BASE_URL || env.ZB_UTILITIES_BASE_URL || baseRoot;
  const webhookSecret = env.SMILE_PAY_WEBHOOK_SECRET || env.ZB_WEBHOOK_SECRET;

  return {
    apiKey,
    apiSecret,
    baseUrl: rawBaseUrl,
    baseRoot,
    utilitiesBaseUrl,
    webhookSecret,
  };
}

function buildAuthHeaders() {
  const { apiKey, apiSecret } = getSmilePayConfig();
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "x-api-secret": apiSecret,
  };
}

export function normalizeZimbabweMobileNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("263") && digits.length >= 12) {
    return digits;
  }
  if (digits.startsWith("0") && digits.length >= 10) {
    return `263${digits.slice(1)}`;
  }
  return digits;
}

function withFriendlyGatewayMessage(message: string, paymentMethod?: PaymentMethod) {
  if (/checking account not found/i.test(message)) {
    const methodLabel = paymentMethod ? getPaymentMethodLabel(paymentMethod) : "This payment method";
    return `${methodLabel} is not provisioned for this Smile Pay merchant in the current environment. Confirm ${methodLabel} is enabled for the merchant and that sandbox credentials use the sandbox base URL.`;
  }
  if (/gateway timeout/i.test(message) && /innbucks/i.test(message)) {
    return "InnBucks is temporarily unavailable from the upstream Smile Pay environment. Please try again shortly or use another payment method.";
  }
  if (/cannot invoke .*getMobile\(\).*null/i.test(message)) {
    const methodLabel = paymentMethod ? getPaymentMethodLabel(paymentMethod) : "This payment method";
    return `${methodLabel} was rejected by Smile Pay because no wallet mobile number reached the upstream gateway. Double-check the supplied mobile number and merchant provisioning.`;
  }
  return message;
}

function parseJsonText<T>(text: string) {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse Smile Pay response: ${text}`);
  }
}

async function handleJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
  paymentMethod?: PaymentMethod,
) {
  let data: T & { responseMessage?: string; message?: string };
  if (typeof response.text === "function") {
    data = parseJsonText<T & { responseMessage?: string; message?: string }>(await response.text());
  } else if (typeof response.json === "function") {
    data = await response.json() as T & { responseMessage?: string; message?: string };
  } else {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    const configuredBaseUrl = getSmilePayConfig().baseUrl;
    let message = withFriendlyGatewayMessage(data.responseMessage || data.message || fallbackMessage, paymentMethod);
    if (
      response.status >= 500
      && configuredBaseUrl.includes("/wallet_gateway/")
      && process.env.NODE_ENV !== "production"
    ) {
      message = `${message} If you are using Smile Pay test credentials, switch the API base URL to https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway.`;
    }
    throw new SmilePayGatewayError(
      response.status,
      message,
      data,
    );
  }

  return data;
}

async function handleExpressResponse(
  response: Response,
  paymentMethod?: PaymentMethod,
) {
  return handleJsonResponse<SmilePayInitiateResponse>(response, "Smile Pay request failed", paymentMethod);
}

function getExpressPath(paymentMethod: Exclude<PaymentMethod, "CARD">) {
  switch (paymentMethod) {
    case "ECOCASH":
      return { path: "payments/express-checkout/ecocash", mobileField: "ecocashMobile" as const };
    case "INNBUCKS":
      return { path: "payments/express-checkout/innbucks", mobileField: "innbucksMobile" as const };
    case "OMARI":
      return { path: "payments/express-checkout/omari", mobileField: "omariMobile" as const };
    case "ONEMONEY":
      return { path: "payments/express-checkout/onemoney", mobileField: "onemoneyMobile" as const };
    case "WALLETPLUS":
      return { path: "payments/express-checkout/zb-payment", mobileField: "zbWalletMobile" as const };
  }
}

function getExpressConfirmPath(paymentMethod: Exclude<PaymentMethod, "CARD">) {
  switch (paymentMethod) {
    case "ECOCASH":
      return "payments/express-checkout/ecocash/confirmation";
    case "INNBUCKS":
      return "payments/express-checkout/innbucks/confirmation";
    case "OMARI":
      return "payments/express-checkout/omari/confirmation";
    case "ONEMONEY":
      return "payments/express-checkout/onemoney/confirmation";
    case "WALLETPLUS":
      return "payments/express-checkout/zb-payment/confirmation";
  }
}

export async function initiateSmilePayStandardCheckout(payload: SmilePayInitiatePayload) {
  const { baseUrl } = getSmilePayConfig();
  const response = await fetch(`${baseUrl}/payments/initiate-transaction`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleJsonResponse<SmilePayInitiateResponse>(
    response,
    "Failed to initiate Smile Pay standard checkout",
    "CARD",
  );
}

export async function initiateSmilePayExpressCheckout(
  paymentMethod: Exclude<PaymentMethod, "CARD">,
  payload: SmilePayExpressInitiatePayload,
) {
  const { baseUrl } = getSmilePayConfig();
  const mobileFromPayload = paymentMethod === "ECOCASH"
    ? payload.customerMobile || payload.ecocashMobile
    : paymentMethod === "INNBUCKS"
      ? payload.customerMobile || payload.innbucksMobile
      : paymentMethod === "OMARI"
        ? payload.customerMobile || payload.omariMobile
        : paymentMethod === "ONEMONEY"
          ? payload.customerMobile || payload.oneMoneyMobile || payload.onemoneyMobile
          : payload.customerMobile || payload.zbWalletMobile;

  if (!mobileFromPayload) {
    throw new Error(`${paymentMethod} requires a mobile number.`);
  }

  const normalizedMobile = normalizeZimbabweMobileNumber(mobileFromPayload);
  const { path, mobileField } = getExpressPath(paymentMethod);
  const body: SmilePayExpressInitiatePayload = {
    ...payload,
    customerMobile: normalizedMobile,
    [mobileField]: normalizedMobile,
  };

  if (paymentMethod === "ONEMONEY") {
    body.oneMoneyMobile = normalizedMobile;
  }

  const response = await fetch(`${baseUrl}/${path}`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(body),
  });

  return handleExpressResponse(response, paymentMethod);
}

export async function initiateSmilePayCardExpressCheckout(
  payload: SmilePayExpressInitiatePayload & CardPaymentDetails,
) {
  const { baseUrl } = getSmilePayConfig();
  const response = await fetch(`${baseUrl}/payments/express-checkout/mpgs`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      ...payload,
      paymentMethod: "CARD",
    }),
  });

  return handleExpressResponse(response, "CARD");
}

export async function confirmSmilePayExpressCheckout(
  paymentMethod: Exclude<PaymentMethod, "CARD">,
  payload: SmilePayConfirmPayload,
) {
  const { baseUrl } = getSmilePayConfig();
  const response = await fetch(`${baseUrl}/${getExpressConfirmPath(paymentMethod)}`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleExpressResponse(response, paymentMethod);
}

export async function checkSmilePayStatus(orderReference: string) {
  const { baseUrl } = getSmilePayConfig();
  const response = await fetch(
    `${baseUrl}/payments/transaction/${encodeURIComponent(orderReference)}/status/check`,
    {
      method: "GET",
      headers: buildAuthHeaders(),
    },
  );

  return handleJsonResponse<SmilePayStatusResponse>(
    response,
    "Failed to check Smile Pay payment status",
  );
}

export async function cancelSmilePayPayment(orderReference: string) {
  const { baseUrl } = getSmilePayConfig();
  const response = await fetch(
    `${baseUrl}/payments/transaction/${encodeURIComponent(orderReference)}/cancel`,
    {
      method: "POST",
      headers: buildAuthHeaders(),
    },
  );

  return handleJsonResponse<Record<string, unknown>>(
    response,
    "Failed to cancel Smile Pay payment",
  );
}

export async function validateSmilePayUtility(payload: SmilePayUtilityValidationPayload) {
  const { utilitiesBaseUrl } = getSmilePayConfig();
  const response = await fetch(
    `${utilitiesBaseUrl.replace(/\/$/, "")}/utilities/v1/customer-validation`,
    {
      method: "POST",
      headers: buildAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );

  return handleJsonResponse<SmilePayUtilityValidationResponse>(
    response,
    "Smile Pay utility validation failed",
  );
}

export async function vendSmilePayUtility(payload: SmilePayUtilityVendPayload) {
  const { utilitiesBaseUrl } = getSmilePayConfig();
  const response = await fetch(
    `${utilitiesBaseUrl.replace(/\/$/, "")}/utilities/v1/vend`,
    {
      method: "POST",
      headers: buildAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );

  return handleJsonResponse<SmilePayUtilityVendResponse>(
    response,
    "Smile Pay utility vend failed",
  );
}

export function getSmilePayDigitalCheckoutUrl() {
  return env.SMILE_PAY_DIGITAL_CHECKOUT_URL || env.ZB_DIGITAL_CHECKOUT_URL;
}

export function sanitizeSmilePayInitiationResponse(
  response: SmilePayInitiateResponse,
): Omit<SmilePayInitiateResponse, "redirectHtml"> & Partial<Pick<SmilePayCardAuthResponse, "authenticationStatus">> {
  const { redirectHtml: _redirectHtml, ...safeResponse } = response;
  return safeResponse;
}

export function getSmilePayWebhookSecret() {
  return getSmilePayConfig().webhookSecret;
}

export function verifySmilePayWebhookSignature(payload: Record<string, unknown>, signature: string) {
  const { apiSecret } = getSmilePayConfig();
  const expectedSignature = crypto
    .createHmac("sha256", apiSecret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return signature === expectedSignature;
}

export function initiateEcocashExpress(payload: SmilePayExpressInitiatePayload) {
  return initiateSmilePayExpressCheckout("ECOCASH", payload);
}

export function initiateInnbucksExpress(payload: SmilePayExpressInitiatePayload) {
  return initiateSmilePayExpressCheckout("INNBUCKS", payload);
}

export function initiateOmariExpress(payload: SmilePayExpressInitiatePayload) {
  return initiateSmilePayExpressCheckout("OMARI", payload);
}

export function initiateOneMoneyExpress(payload: SmilePayExpressInitiatePayload) {
  return initiateSmilePayExpressCheckout("ONEMONEY", payload);
}

export function initiateSmileCashExpress(payload: SmilePayExpressInitiatePayload) {
  return initiateSmilePayExpressCheckout("WALLETPLUS", payload);
}

export function initiateMpgsCardExpress(payload: SmilePayExpressInitiatePayload & CardPaymentDetails) {
  return initiateSmilePayCardExpressCheckout(payload);
}

export function confirmEcocashExpress(payload: SmilePayConfirmPayload) {
  return confirmSmilePayExpressCheckout("ECOCASH", payload);
}

export function confirmInnbucksExpress(payload: SmilePayConfirmPayload) {
  return confirmSmilePayExpressCheckout("INNBUCKS", payload);
}

export function confirmOmariExpress(payload: SmilePayConfirmPayload) {
  return confirmSmilePayExpressCheckout("OMARI", payload);
}

export function confirmOneMoneyExpress(payload: SmilePayConfirmPayload) {
  return confirmSmilePayExpressCheckout("ONEMONEY", payload);
}

export function confirmSmileCashExpress(payload: SmilePayConfirmPayload) {
  return confirmSmilePayExpressCheckout("WALLETPLUS", payload);
}
