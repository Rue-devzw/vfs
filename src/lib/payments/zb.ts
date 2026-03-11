import { env } from "@/lib/env";

export type PaymentMethod = "WALLETPLUS" | "ECOCASH" | "INNBUCKS" | "CARD" | "OMARI" | "ONEMONEY";

type ZbInitiatePayload = {
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

export type ZbInitiateResponse = {
  responseMessage?: string;
  responseCode?: string;
  paymentUrl?: string;
  transactionReference?: string;
  status?: string;
  message?: string;
};

type ZbStatusResponse = {
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
};

// Express Checkout Types
export type ZbExpressInitiatePayload = {
  orderReference: string;
  amount: number;
  resultUrl: string;
  itemName: string;
  itemDescription: string;
  currencyCode: string;
  customerMobile?: string; // Generic mobile for the provider (Ecocash, Innbucks, etc)
  zbWalletMobile?: string; // Backward compatibility for older WalletPlus callers
  returnUrl?: string;
  cancelUrl?: string;
  failureUrl?: string;
  firstName?: string;
  lastName?: string;
  mobilePhoneNumber?: string;
  email?: string;
};

export type ZbExpressResponse = {
  responseMessage?: string;
  responseCode?: string;
  status?: string;
  transactionReference?: string;
  paymentUrl?: string;
  message?: string;
};

export type ZbCheckoutResponse = ZbInitiateResponse | ZbExpressResponse;

export class ZbGatewayError extends Error {
  readonly status: number;
  readonly responseBody?: unknown;

  constructor(status: number, message: string, responseBody?: unknown) {
    super(message);
    this.name = "ZbGatewayError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

function getZbConfig() {
  const apiKey = env.ZB_API_KEY;
  const apiSecret = env.ZB_API_SECRET;

  const rawBaseUrl = env.ZB_API_BASE_URL
    || (process.env.NODE_ENV === "production"
      ? "https://zbnet.zb.co.zw/wallet_gateway/payments-gateway"
      : "https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway");

  // Derive the root by removing the specific gateway suffix if present
  // This allows us to call /utilities or other modules sibling to payments-gateway
  const baseRoot = rawBaseUrl.replace(/\/payments-gateway\/?$/, "");

  return { apiKey, apiSecret, baseUrl: rawBaseUrl, baseRoot };
}

function buildAuthHeaders() {
  const { apiKey, apiSecret } = getZbConfig();
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "x-api-secret": apiSecret,
  };
}

/**
 * STANDARD CHECKOUT (Redirect for Cards/General)
 */
export async function initiateZbStandardCheckout(payload: ZbInitiatePayload) {
  const { baseUrl } = getZbConfig();
  const response = await fetch(`${baseUrl}/payments/initiate-transaction`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as ZbInitiateResponse;
  if (!response.ok) {
    throw new ZbGatewayError(response.status, data.responseMessage || data.message || "Failed to initiate ZB transaction", data);
  }
  return data;
}

/**
 * EXPRESS CHECKOUT - Leg 1: Initiate
 */

// Ecocash
export async function initiateEcocashExpress(payload: ZbExpressInitiatePayload) {
  const { baseUrl } = getZbConfig();
  if (!payload.customerMobile) {
    throw new Error("Customer mobile number is required for Ecocash.");
  }
  const body = { ...payload, ecocashMobile: payload.customerMobile };
  console.log("ZB Request [Ecocash]:", JSON.stringify(body, null, 2));
  const response = await fetch(`${baseUrl}/payments/express-checkout/ecocash`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleExpressInitiateResponse(response);
}

// Innbucks
export async function initiateInnbucksExpress(payload: ZbExpressInitiatePayload) {
  const { baseUrl } = getZbConfig();
  if (!payload.customerMobile) {
    throw new Error("Customer mobile number is required for Innbucks.");
  }
  const body = { ...payload, innbucksMobile: payload.customerMobile };
  console.log("ZB Request [Innbucks]:", JSON.stringify(body, null, 2));
  const response = await fetch(`${baseUrl}/payments/express-checkout/innbucks`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleExpressInitiateResponse(response);
}

// Omari
export async function initiateOmariExpress(payload: ZbExpressInitiatePayload) {
  const { baseUrl } = getZbConfig();
  if (!payload.customerMobile) {
    throw new Error("Customer mobile number is required for Omari.");
  }
  const body = { ...payload, omariMobile: payload.customerMobile };
  console.log("ZB Request [Omari]:", JSON.stringify(body, null, 2));
  const response = await fetch(`${baseUrl}/payments/express-checkout/omari`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleExpressInitiateResponse(response);
}

// SmileCash (WalletPlus)
export async function initiateSmileCashExpress(payload: ZbExpressInitiatePayload) {
  const { baseUrl } = getZbConfig();
  const walletMobile = payload.customerMobile || payload.zbWalletMobile;
  if (!walletMobile) {
    throw new Error("Wallet mobile number is required for SmileCash.");
  }
  const body = { ...payload, customerMobile: walletMobile, zbWalletMobile: walletMobile };
  console.log("ZB Request [SmileCash]:", JSON.stringify(body, null, 2));
  const response = await fetch(`${baseUrl}/payments/express-checkout/zb-payment`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleExpressInitiateResponse(response);
}

// Backward-compatible alias used by older routes.
export const initiateZbWalletExpress = initiateSmileCashExpress;

/**
 * EXPRESS CHECKOUT - Leg 2: Confirm (OTP)
 */

export async function confirmOmariExpress(input: { otp: string; transactionReference: string }) {
  const { baseUrl } = getZbConfig();
  const response = await fetch(`${baseUrl}/payments/express-checkout/omari/confirmation`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(input),
  });
  return handleExpressResponse(response);
}

export async function confirmSmileCashExpress(input: { otp: string; transactionReference: string }) {
  const { baseUrl } = getZbConfig();
  const response = await fetch(`${baseUrl}/payments/express-checkout/zb-payment/confirmation`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(input),
  });
  return handleExpressResponse(response);
}

/**
 * UTILS & STATUS
 */

export async function checkZbStatus(orderReference: string) {
  const { baseUrl } = getZbConfig();
  const response = await fetch(
    `${baseUrl}/payments/transaction/${encodeURIComponent(orderReference)}/status/check`,
    {
      method: "GET",
      headers: buildAuthHeaders(),
    },
  );

  const data = (await response.json()) as ZbStatusResponse;
  if (!response.ok) throw new Error("Failed to fetch ZB status");
  return data;
}

/**
 * UTILITY SERVICES (ZESA, etc.)
 */

export type UtilityValidationPayload = {
  billerCode: string;
  accountNumber: string;
};

export type UtilityValidationResponse = {
  success: boolean;
  accountName?: string;
  accountNumber?: string;
  error?: string;
};

export type UtilityVendPayload = {
  billerCode: string;
  accountNumber: string;
  amount: number;
  transactionReference: string;
};

export type UtilityVendResponse = {
  success: boolean;
  token?: string;
  units?: number;
  receiptNumber?: string;
  amount?: number;
  error?: string;
};

export async function validateUtility(payload: UtilityValidationPayload) {
  const { baseRoot } = getZbConfig();
  const url = `${baseRoot}/utilities/v1/customer-validation`;
  console.log(`ZB Utility Validation Request [${url}]:`, JSON.stringify(payload));

  const response = await fetch(url, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log(`ZB Utility Validation Response [${response.status}]:`, text);

  let data;
  try {
    data = JSON.parse(text) as UtilityValidationResponse;
  } catch {
    throw new Error(`Failed to parse ZB response: ${text}`);
  }

  if (!response.ok) {
    throw new ZbGatewayError(response.status, data.error || "Utility validation failed", data);
  }
  return data;
}

export async function vendUtility(payload: UtilityVendPayload) {
  const { baseRoot } = getZbConfig();
  const url = `${baseRoot}/utilities/v1/vend`;
  console.log(`ZB Utility Vend Request [${url}]:`, JSON.stringify(payload));

  const response = await fetch(url, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log(`ZB Utility Vend Response [${response.status}]:`, text);

  let data;
  try {
    data = JSON.parse(text) as UtilityVendResponse;
  } catch {
    throw new Error(`Failed to parse ZB response: ${text}`);
  }

  if (!response.ok) {
    throw new ZbGatewayError(response.status, data.error || "Utility vending failed", data);
  }
  return data;
}

async function handleExpressInitiateResponse(response: Response) {
  const text = await response.text();
  console.log("ZB Express Initiate Response Status:", response.status);
  console.log("ZB Express Initiate Response Body:", text);

  let data;
  try {
    data = JSON.parse(text) as ZbExpressResponse;
  } catch {
    throw new Error(`Failed to parse ZB response: ${text}`);
  }

  if (!response.ok) {
    throw new ZbGatewayError(
      response.status,
      data.responseMessage || data.message || `Initiation failed with status ${response.status}`,
      data,
    );
  }
  if (!data.transactionReference) throw new Error("Missing transaction reference in ZB response");
  return data;
}

async function handleExpressResponse(response: Response) {
  const text = await response.text();
  console.log("ZB Express Response Status:", response.status);
  console.log("ZB Express Response Body:", text);

  let data;
  try {
    data = JSON.parse(text) as ZbExpressResponse;
  } catch {
    throw new Error(`Failed to parse ZB response: ${text}`);
  }

  if (!response.ok) {
    throw new ZbGatewayError(
      response.status,
      data.responseMessage || data.message || `Process failed with status ${response.status}`,
      data,
    );
  }
  return data;
}
