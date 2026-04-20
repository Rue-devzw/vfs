import { getPaymentMethodLabel, type PaymentMethod } from "./payment-methods";

export type PaymentInitLike = {
  reference: string;
  transactionReference?: string;
  status?: string;
  paymentUrl?: string;
  redirectHtml?: string;
};

export type PurchaseFlowAction =
  | { type: "otp" }
  | { type: "html"; html: string }
  | { type: "redirect"; url: string }
  | { type: "poll" };

export function normalizeGatewayStatus(status?: string) {
  return String(status ?? "PENDING").toUpperCase();
}

export function isSuccessfulGatewayStatus(status?: string) {
  const normalized = normalizeGatewayStatus(status);
  return normalized === "PAID" || normalized === "SUCCESS";
}

export function isFailedGatewayStatus(status?: string) {
  const normalized = normalizeGatewayStatus(status);
  return ["FAILED", "CANCELED", "CANCELLED", "EXPIRED"].includes(normalized);
}

export function shouldContinueStatusPolling(status?: string, hasVendedData = false) {
  const normalized = normalizeGatewayStatus(status);
  if (isFailedGatewayStatus(normalized)) {
    return false;
  }

  if (isSuccessfulGatewayStatus(normalized)) {
    return !hasVendedData;
  }

  return true;
}

export function buildReceiptMessage(status?: string, hasToken = false) {
  if (isSuccessfulGatewayStatus(status)) {
    return hasToken
      ? "Payment and vending successful."
      : "Payment successful. Token vending may be delayed.";
  }

  return "Payment confirmation is pending or failed.";
}

export function resolvePurchaseFlowAction(result: PaymentInitLike): PurchaseFlowAction {
  if (normalizeGatewayStatus(result.status) === "AWAITING_OTP") {
    return { type: "otp" };
  }

  if (result.redirectHtml) {
    return { type: "html", html: result.redirectHtml };
  }

  if (result.paymentUrl) {
    return { type: "redirect", url: result.paymentUrl };
  }

  return { type: "poll" };
}

export function getPaymentProgressContent(status: string | undefined, options?: {
  paymentMethod?: PaymentMethod;
  subject?: string;
  manualReview?: boolean;
}) {
  const normalized = normalizeGatewayStatus(status);
  const methodLabel = options?.paymentMethod ? getPaymentMethodLabel(options.paymentMethod) : "your payment method";
  const subject = options?.subject ?? "your payment";

  switch (normalized) {
    case "AWAITING_OTP":
      return {
        title: "Verification needed",
        description: `Enter the OTP sent by ${methodLabel} to complete ${subject}.`,
      };
    case "SENT":
    case "AWAITING_PAYMENT":
    case "PENDING":
      return {
        title: "Waiting for confirmation",
        description: `We have submitted ${subject}. Approve the prompt on your device and keep this page open while we confirm the result.`,
      };
    case "PROCESSING":
    case "PENDING_3DS":
      return {
        title: normalized === "PENDING_3DS" ? "Bank verification required" : "Payment is being processed",
        description: normalized === "PENDING_3DS"
          ? `Your bank needs one more verification step to complete ${subject}. Continue with the secure challenge to finish payment.`
          : `The gateway has acknowledged ${subject}. We are waiting for its final confirmation now.`,
      };
    case "PAID":
    case "SUCCESS":
      return {
        title: "Payment confirmed",
        description: options?.manualReview
          ? `${subject} was paid successfully and is now being tracked for fulfilment confirmation.`
          : `${subject} was paid successfully.`,
      };
    case "FAILED":
      return {
        title: "Payment failed",
        description: `The gateway marked ${subject} as failed. You can try again or contact support if funds were deducted.`,
      };
    case "CANCELED":
    case "CANCELLED":
      return {
        title: "Payment cancelled",
        description: `The payment request for ${subject} was cancelled before completion.`,
      };
    case "EXPIRED":
      return {
        title: "Payment expired",
        description: `The payment request expired before it was confirmed. You can start a new attempt when ready.`,
      };
    default:
      return {
        title: "Payment update pending",
        description: `We are still waiting for a status update for ${subject}.`,
      };
  }
}
