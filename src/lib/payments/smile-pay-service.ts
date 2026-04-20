import { mapGatewayStatusToPaymentIntent, upsertPaymentIntent } from "@/lib/firestore/payments";
import { syncDigitalFulfilmentForOrder } from "@/lib/digital-fulfilment";
import { isSuccessfulGatewayStatus } from "@/lib/payment-flow";
import type { PaymentMethod } from "@/lib/payment-methods";
import { getOrder, setOrderStatus } from "@/server/orders";
import {
  checkSmilePayStatus,
  confirmSmilePayExpressCheckout,
  initiateSmilePayExpressCheckout,
  initiateSmilePayCardExpressCheckout,
  SmilePayGatewayError,
  sanitizeSmilePayInitiationResponse,
  type SmilePayInitiateResponse,
  type SmilePayStatusResponse,
} from "./smile-pay";
import { normalizeCardPaymentDetails, type CardPaymentDetails } from "./types";

const PAYMENT_PROVIDER = "smile-pay";

type SharedInitiationInput = {
  reference: string;
  amount: number;
  currencyCode: "840" | "924";
  paymentMethod: PaymentMethod;
  returnUrl: string;
  resultUrl: string;
  itemName: string;
  itemDescription: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerMobile?: string;
  cardDetails?: CardPaymentDetails;
  cancelUrl?: string;
  failureUrl?: string;
};

type PersistGatewayUpdateInput = {
  reference: string;
  status: string;
  paymentMethod?: string;
  gatewayReference?: string;
  responsePayload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  syncFulfilment?: boolean;
};

function splitName(customerName: string) {
  const [firstName, ...rest] = customerName.trim().split(/\s+/);
  return {
    firstName: firstName || undefined,
    lastName: rest.length ? rest.join(" ") : undefined,
  };
}

export async function initiateSmilePayOrderPayment(input: SharedInitiationInput) {
  const { firstName, lastName } = splitName(input.customerName);
  const basePayload = {
    orderReference: input.reference,
    amount: input.amount,
    returnUrl: input.returnUrl,
    resultUrl: input.resultUrl,
    itemName: input.itemName,
    itemDescription: input.itemDescription,
    currencyCode: input.currencyCode,
    firstName,
    lastName,
    mobilePhoneNumber: input.customerPhone,
    email: input.customerEmail,
    cancelUrl: input.cancelUrl,
    failureUrl: input.failureUrl,
  };

  if (input.paymentMethod === "CARD") {
    if (!input.cardDetails) {
      throw new Error("Card details are required for direct card checkout.");
    }

    const cardDetails = normalizeCardPaymentDetails(input.cardDetails);
    if (
      cardDetails.pan.length < 12
      || cardDetails.expMonth.length !== 2
      || cardDetails.expYear.length !== 2
      || cardDetails.securityCode.length < 3
    ) {
      throw new Error("Card details are incomplete. Check the card number, expiry, and CVV, then try again.");
    }

    const result = await initiateSmilePayCardExpressCheckout({
      ...basePayload,
      paymentMethod: "CARD",
      pan: cardDetails.pan,
      expMonth: cardDetails.expMonth,
      expYear: cardDetails.expYear,
      securityCode: cardDetails.securityCode,
    });

    const normalizedStatus = String(result.status ?? "PENDING").toUpperCase();
    if (["FAILED", "EXPIRED", "CANCELED", "CANCELLED"].includes(normalizedStatus)) {
      throw new SmilePayGatewayError(
        502,
        result.responseMessage
          || result.message
          || "Card checkout was rejected by Smile Pay before the secure payment page could open.",
        result,
      );
    }

    if (!result.paymentUrl && !result.redirectHtml && !isSuccessfulGatewayStatus(normalizedStatus)) {
      throw new SmilePayGatewayError(
        502,
        "Smile Pay card checkout did not return a usable 3D Secure handoff. Confirm card payments are enabled for this merchant and try again.",
        result,
      );
    }

    return result;
  }

  const result = await initiateSmilePayExpressCheckout(input.paymentMethod, {
    ...basePayload,
    customerMobile: input.customerMobile,
  });

  const normalizedResult = normalizeSmilePayInitiationResult(input.paymentMethod, result);
  const normalizedStatus = String(normalizedResult.status ?? "PENDING").toUpperCase();

  if (["FAILED", "EXPIRED", "CANCELED", "CANCELLED"].includes(normalizedStatus)) {
    throw new SmilePayGatewayError(
      502,
      describeImmediateInitiationFailure(input.paymentMethod, normalizedResult),
      normalizedResult,
    );
  }

  return normalizedResult;
}

export function normalizeSmilePayInitiationResult(
  paymentMethod: PaymentMethod,
  result: SmilePayInitiateResponse,
): SmilePayInitiateResponse {
  if (
    paymentMethod === "CARD"
    && result.redirectHtml
    && String(result.status ?? "PENDING").toUpperCase() === "PENDING_3DS"
  ) {
    return {
      ...result,
      responseMessage: result.responseMessage ?? "Additional bank verification is required to complete your card payment.",
    };
  }

  if (
    (paymentMethod === "WALLETPLUS" || paymentMethod === "OMARI")
    && result.transactionReference
    && !result.paymentUrl
    && String(result.status ?? "PENDING").toUpperCase() !== "FAILED"
  ) {
    return {
      ...result,
      status: "AWAITING_OTP",
      responseMessage: result.responseMessage
        ?? (paymentMethod === "OMARI"
          ? "OTP sent. Enter the code to complete Omari payment."
          : "OTP sent. Enter the code to complete SmileCash payment."),
    };
  }

  return result;
}

function describeImmediateInitiationFailure(
  paymentMethod: PaymentMethod,
  result: SmilePayInitiateResponse,
) {
  if (paymentMethod === "OMARI") {
    return "Omari initiation was rejected by Smile Pay before OTP dispatch. This usually means Omari is not enabled for this merchant/environment or the supplied wallet details were not accepted.";
  }

  if (paymentMethod === "ONEMONEY") {
    return "OneMoney initiation was rejected by Smile Pay before the customer approval step. This usually means OneMoney is not enabled for this merchant/environment or the upstream wallet charge request was declined immediately.";
  }

  if (paymentMethod === "INNBUCKS") {
    return "InnBucks initiation failed before the customer approval step. This usually points to an upstream Smile Pay or InnBucks environment issue rather than a local checkout error.";
  }

  if (paymentMethod === "ECOCASH") {
    return "EcoCash initiation failed before the customer approval step. Please verify the wallet number and merchant provisioning, then try again.";
  }

  return result.responseMessage
    || result.message
    || `${paymentMethod} initiation failed before the payment session could start.`;
}

export async function persistSmilePayGatewayUpdate(input: PersistGatewayUpdateInput) {
  await setOrderStatus(input.reference, input.status, {
    ...(input.meta ?? {}),
    gatewayReference: input.gatewayReference,
  });
  await upsertPaymentIntent({
    orderReference: input.reference,
    provider: PAYMENT_PROVIDER,
    paymentMethod: input.paymentMethod ?? "UNKNOWN",
    gatewayReference: input.gatewayReference,
    status: mapGatewayStatusToPaymentIntent(input.status),
    responsePayload: input.responsePayload,
  });

  if (input.syncFulfilment !== false) {
    return syncDigitalFulfilmentForOrder(input.reference, input.status);
  }

  return null;
}

export async function confirmSmilePayOrderPayment(input: {
  reference: string;
  transactionReference: string;
  otp: string;
  paymentMethod: PaymentMethod;
  customerMobile?: string;
}) {
  if (input.paymentMethod === "CARD") {
    throw new Error("Card payments do not use OTP confirmation on this route.");
  }

  const result = await confirmSmilePayExpressCheckout(input.paymentMethod, {
    otp: input.otp,
    transactionReference: input.transactionReference,
    ...(input.paymentMethod === "OMARI" && input.customerMobile ? { omariMobile: input.customerMobile } : {}),
  });

  await persistSmilePayGatewayUpdate({
    reference: input.reference,
    status: result.status ?? "PENDING",
    paymentMethod: input.paymentMethod,
    gatewayReference: result.transactionReference ?? input.transactionReference,
    responsePayload: result as Record<string, unknown>,
    meta: {
      responseCode: result.responseCode,
      paymentOption: input.paymentMethod,
    },
  });

  return result;
}

export async function syncSmilePayOrderStatus(reference: string) {
  const statusResult = await checkSmilePayStatus(reference);
  const status = statusResult.status ?? "PENDING";
  const existingOrder = await getOrder(reference);

  if (process.env.NODE_ENV !== "production" && reference.startsWith("digi_")) {
    console.info("[DEV STATUS] Smile Pay status sync", {
      reference,
      status,
      paymentOption: statusResult.paymentOption,
      gatewayReference: statusResult.reference,
      amount: statusResult.amount,
      existingOrderStatus: existingOrder?.status,
      accountNumber: existingOrder?.paymentMeta?.accountNumber,
      serviceType: existingOrder?.paymentMeta?.serviceType,
    });
  }

  const fulfilmentResult = await persistSmilePayGatewayUpdate({
    reference,
    status,
    paymentMethod: statusResult.paymentOption ?? "UNKNOWN",
    gatewayReference: statusResult.reference,
    responsePayload: statusResult as Record<string, unknown>,
    meta: {
      paymentOption: statusResult.paymentOption,
      amount: statusResult.amount,
      currency: statusResult.currency,
    },
  });

  const order = fulfilmentResult?.order ?? existingOrder;

  if (process.env.NODE_ENV !== "production" && reference.startsWith("digi_")) {
    console.info("[DEV STATUS] Smile Pay status sync result", {
      reference,
      status,
      fulfilmentOrderStatus: order?.status,
      fulfilmentShippingStatus: order?.shipping?.status,
      hasVendedData: Boolean(fulfilmentResult?.vendedData),
      vendedData: fulfilmentResult?.vendedData,
    });
  }

  return {
    statusResult,
    order,
    fulfilmentResult,
  };
}

export type SmilePayStatusSummary = {
  reference: string;
  status: string;
  paymentOption?: string;
  amount?: number;
  amountUsd?: number;
  currencyCode?: "840" | "924";
  transactionReference?: string;
  accountReference?: string;
  meterNumber?: string;
  vendedData?: unknown;
};

function mapSmilePayCurrencyToCode(currency: unknown): "840" | "924" | undefined {
  if (currency === "ZWG" || currency === "924") {
    return "924";
  }

  if (currency === "USD" || currency === "840") {
    return "840";
  }

  return undefined;
}

export function buildSmilePayStatusSummary(input: {
  reference: string;
  statusResult: SmilePayStatusResponse;
  order: Awaited<ReturnType<typeof getOrder>>;
  vendedData?: unknown;
}): SmilePayStatusSummary {
  return {
    reference: input.reference,
    status: input.statusResult.status ?? "PENDING",
    paymentOption: input.statusResult.paymentOption,
    amount: input.order?.total ?? input.statusResult.amount,
    amountUsd: input.order?.totalUsd,
    currencyCode: input.order?.currencyCode === "924"
      ? "924"
      : input.order?.currencyCode === "840"
        ? "840"
        : mapSmilePayCurrencyToCode(input.statusResult.currency),
    transactionReference: input.statusResult.reference,
    accountReference: typeof input.order?.paymentMeta?.accountNumber === "string"
      ? input.order.paymentMeta.accountNumber
      : undefined,
    meterNumber: input.order?.items?.[0]?.id?.startsWith?.("zesa-")
      ? String(input.order.items[0].id).split("zesa-")[1]
      : undefined,
    ...(input.vendedData !== undefined ? { vendedData: input.vendedData } : {}),
  };
}

export type SmilePayInitiationResult = SmilePayInitiateResponse;

export function sanitizeSmilePayInitiationResultForPersistence(result: SmilePayInitiateResponse) {
  return sanitizeSmilePayInitiationResponse(result) as Record<string, unknown>;
}
