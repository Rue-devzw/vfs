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

type SmilePayRequestDebug = {
  label: string;
  url: string;
  init: RequestInit;
};

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function headerEntries(headers: HeadersInit | undefined) {
  if (!headers) {
    return [] as Array<[string, string]>;
  }

  if (headers instanceof Headers) {
    const entries: Array<[string, string]> = [];
    headers.forEach((value, key) => entries.push([key, value]));
    return entries;
  }

  if (Array.isArray(headers)) {
    return headers.map(([key, value]) => [key, value] as [string, string]);
  }

  return Object.entries(headers).map(([key, value]) => [key, String(value)] as [string, string]);
}

function redactHeaderValue(name: string, value: string) {
  if (/api[-_]?key|api[-_]?secret|authorization|token|secret/i.test(name)) {
    return `<redacted:${name}>`;
  }
  return value;
}

function redactJsonBody(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactJsonBody);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, fieldValue]) => [
      key,
      /pan|securityCode|cvv|cardNumber|password|token|secret/i.test(key)
        ? `<redacted:${key}>`
        : redactJsonBody(fieldValue),
    ]),
  );
}

function bodyForCurl(body: BodyInit | null | undefined) {
  if (typeof body !== "string") {
    return undefined;
  }

  try {
    return JSON.stringify(redactJsonBody(JSON.parse(body)));
  } catch {
    return body;
  }
}

function buildRedactedSmilePayCurl({ url, init }: SmilePayRequestDebug) {
  const method = init.method || "GET";
  const lines = [`curl -i -X ${method} ${shellQuote(url)}`];

  for (const [name, value] of headerEntries(init.headers)) {
    lines.push(`  -H ${shellQuote(`${name}: ${redactHeaderValue(name, value)}`)}`);
  }

  const body = bodyForCurl(init.body);
  if (body) {
    lines.push(`  --data-raw ${shellQuote(body)}`);
  }

  return lines.join(" \\\n");
}

function logRedactedSmilePayCurl(requestDebug?: SmilePayRequestDebug) {
  if (!requestDebug || process.env.NODE_ENV === "test") {
    return;
  }

  console.info(
    `[Smile Pay upstream cURL - redacted] ${requestDebug.label}\n${buildRedactedSmilePayCurl(requestDebug)}`,
  );
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
  if (/authentication executing POST/i.test(message) || /\/auth\/authenticate/i.test(message)) {
    return "Smile Pay could not authenticate this payment request in the current gateway environment. Confirm the merchant API key, secret, and enabled payment methods, then try again.";
  }
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

function nonJsonGatewayMessage(status: number) {
  if (status === 404) {
    return "Smile Pay endpoint was not found. Confirm the Smile Pay API base URL and that the selected payment method endpoint is available in this environment.";
  }
  return "Smile Pay returned an unexpected non-JSON response. Please try again shortly or confirm the gateway base URL configuration.";
}

async function handleJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
  paymentMethod?: PaymentMethod,
  requestDebug?: SmilePayRequestDebug,
) {
  let data: T & { responseMessage?: string; message?: string };
  if (typeof response.text === "function") {
    const text = await response.text();
    try {
      data = parseJsonText<T & { responseMessage?: string; message?: string }>(text);
    } catch (error) {
      if (!response.ok) {
        logRedactedSmilePayCurl(requestDebug);
        throw new SmilePayGatewayError(
          response.status,
          nonJsonGatewayMessage(response.status),
          { contentType: response.headers?.get?.("content-type") ?? undefined },
        );
      }
      throw error;
    }
  } else if (typeof response.json === "function") {
    data = await response.json() as T & { responseMessage?: string; message?: string };
  } else {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    logRedactedSmilePayCurl(requestDebug);
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
  requestDebug?: SmilePayRequestDebug,
) {
  return handleJsonResponse<SmilePayInitiateResponse>(
    response,
    "Smile Pay request failed",
    paymentMethod,
    requestDebug,
  );
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
  const url = `${baseUrl}/payments/initiate-transaction`;
  const init = {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  } satisfies RequestInit;
  const response = await fetch(url, init);

  return handleJsonResponse<SmilePayInitiateResponse>(
    response,
    "Failed to initiate Smile Pay standard checkout",
    "CARD",
    { label: "standard checkout", url, init },
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

  const url = `${baseUrl}/${path}`;
  const init = {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(body),
  } satisfies RequestInit;
  const response = await fetch(url, init);

  return handleExpressResponse(response, paymentMethod, { label: `${paymentMethod} express checkout`, url, init });
}

export async function initiateSmilePayCardExpressCheckout(
  payload: SmilePayExpressInitiatePayload & CardPaymentDetails,
) {
  const { baseUrl } = getSmilePayConfig();
  const url = `${baseUrl}/payments/express-checkout/mpgs`;
  const init = {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      ...payload,
      paymentMethod: "CARD",
    }),
  } satisfies RequestInit;
  const response = await fetch(url, init);

  return handleExpressResponse(response, "CARD", { label: "CARD express checkout", url, init });
}

export async function confirmSmilePayExpressCheckout(
  paymentMethod: Exclude<PaymentMethod, "CARD">,
  payload: SmilePayConfirmPayload,
) {
  const { baseUrl } = getSmilePayConfig();
  const url = `${baseUrl}/${getExpressConfirmPath(paymentMethod)}`;
  const init = {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  } satisfies RequestInit;
  const response = await fetch(url, init);

  return handleExpressResponse(response, paymentMethod, { label: `${paymentMethod} express confirmation`, url, init });
}

export async function checkSmilePayStatus(orderReference: string) {
  const { baseUrl } = getSmilePayConfig();
  const url = `${baseUrl}/payments/transaction/${encodeURIComponent(orderReference)}/status/check`;
  const init = {
    method: "GET",
    headers: buildAuthHeaders(),
  } satisfies RequestInit;
  const response = await fetch(url, init);

  return handleJsonResponse<SmilePayStatusResponse>(
    response,
    "Failed to check Smile Pay payment status",
    undefined,
    { label: "payment status check", url, init },
  );
}

export async function cancelSmilePayPayment(orderReference: string) {
  const { baseUrl } = getSmilePayConfig();
  const url = `${baseUrl}/payments/transaction/${encodeURIComponent(orderReference)}/cancel`;
  const init = {
    method: "POST",
    headers: buildAuthHeaders(),
  } satisfies RequestInit;
  const response = await fetch(url, init);

  return handleJsonResponse<Record<string, unknown>>(
    response,
    "Failed to cancel Smile Pay payment",
    undefined,
    { label: "payment cancellation", url, init },
  );
}

export async function validateSmilePayUtility(payload: SmilePayUtilityValidationPayload) {
  const { utilitiesBaseUrl } = getSmilePayConfig();
  const url = `${utilitiesBaseUrl.replace(/\/$/, "")}/utilities/v1/customer-validation`;
  const init = {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  } satisfies RequestInit;
  const response = await fetch(url, init);

  return handleJsonResponse<SmilePayUtilityValidationResponse>(
    response,
    "Smile Pay utility validation failed",
    undefined,
    { label: "utility customer validation", url, init },
  );
}

export async function vendSmilePayUtility(payload: SmilePayUtilityVendPayload) {
  const { utilitiesBaseUrl } = getSmilePayConfig();
  const url = `${utilitiesBaseUrl.replace(/\/$/, "")}/utilities/v1/vend`;
  const init = {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  } satisfies RequestInit;
  const response = await fetch(url, init);

  return handleJsonResponse<SmilePayUtilityVendResponse>(
    response,
    "Smile Pay utility vend failed",
    undefined,
    { label: "utility vend", url, init },
  );
}

export function getSmilePayDigitalCheckoutUrl() {
  return env.SMILE_PAY_DIGITAL_CHECKOUT_URL || env.ZB_DIGITAL_CHECKOUT_URL;
}

export function sanitizeSmilePayInitiationResponse(
  response: SmilePayInitiateResponse,
): Omit<SmilePayInitiateResponse, "redirectHtml"> & Partial<Pick<SmilePayCardAuthResponse, "authenticationStatus">> {
  const safeResponse = { ...response };
  delete safeResponse.redirectHtml;
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
