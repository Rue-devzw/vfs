import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingOrder, setOrderStatus } from "@/server/orders";
import { getProductById } from "@/lib/firestore/products";
import { convertFromUsd, CurrencyCode, getZwgPerUsdRate } from "@/lib/currency";
import { env } from "@/lib/env";
import { getDeliveryQuote } from "@/lib/firestore/shipping";
import { getStoreSettings } from "@/lib/firestore/settings";
import { buildFinanceDocumentNumber, calculateOrderTaxTotals } from "@/lib/finance";
import {
  getPaymentIntentByIdempotencyKey,
  mapGatewayStatusToPaymentIntent,
  upsertPaymentIntent,
} from "@/lib/firestore/payments";
import {
  releaseExpiredReservations,
  releaseInventoryReservations,
  reserveInventoryForOrder,
} from "@/lib/firestore/inventory";
import { enforceRateLimit, getRequestIdentity } from "@/lib/rate-limit";
import {
  initiateSmilePayOrderPayment,
  sanitizeSmilePayInitiationResultForPersistence,
} from "@/lib/payments/smile-pay-service";
import { SmilePayGatewayError } from "@/lib/payments/smile-pay";
import { PAYMENT_METHOD_VALUES } from "@/lib/payment-methods";
import type { CardPaymentDetails } from "@/lib/payments/types";

const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

const optionalTrimmedString = () => z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().optional());

const cardDetailsSchema = z.object({
  pan: z.string().trim().min(12).max(32),
  expMonth: z.string().trim().regex(/^\d{1,2}$/),
  expYear: z.string().trim().regex(/^\d{1,4}$/),
  securityCode: z.string().trim().regex(/^\d{3,4}$/),
});

function buildOrderReference(idempotencyKey?: string | null) {
  if (!idempotencyKey) {
    return `order_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }
  const digest = crypto.createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 18);
  return `order_${digest}`;
}

const initiatePaymentSchema = z.object({
  email: z.string().email(),
  customerMobile: optionalTrimmedString().pipe(z.string().min(8).optional()),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES).default("WALLETPLUS"),
  currencyCode: z.enum(["840", "924"]).default("840"),
  deliveryMethod: z.enum(["collect", "delivery"]).default("collect"),
  customerName: z.string().trim().min(2),
  customerPhone: z.string().trim().min(7),
  customerAddress: z.string().trim().min(1).optional(),
  deliveryQuoteId: z.string().trim().min(1).optional(),
  deliveryInstructions: z.string().trim().max(300).optional(),
  recipientName: z.string().trim().min(2).optional(),
  recipientPhone: z.string().trim().min(7).optional(),
  notes: z.string().trim().max(500).optional(),
  cardDetails: cardDetailsSchema.optional(),
  items: z.array(checkoutItemSchema).min(1),
}).superRefine((data, ctx) => {
  if (data.deliveryMethod === "delivery" && !data.customerAddress) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Customer address is required for delivery orders.",
      path: ["customerAddress"],
    });
  }
  if (data.deliveryMethod === "delivery" && !data.deliveryQuoteId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Delivery quote is required for delivery orders.",
      path: ["deliveryQuoteId"],
    });
  }
  if (data.paymentMethod !== "CARD" && !data.customerMobile) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Customer mobile is required for express payment methods.",
      path: ["customerMobile"],
    });
  }
  if (data.paymentMethod === "CARD" && !data.cardDetails) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Card details are required for card payments.",
      path: ["cardDetails"],
    });
  }
});

export async function POST(req: Request) {
  let reference = "";
  let idempotencyKey: string | null = null;
  let inventoryReserved = false;
  try {
    const rateLimit = await enforceRateLimit({
      namespace: "checkout-initiate",
      identifier: getRequestIdentity(req),
      limit: env.RATE_LIMIT_CHECKOUT_PER_MINUTE ?? 8,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many checkout attempts. Please wait a moment and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    await releaseExpiredReservations();

    idempotencyKey = req.headers.get("x-idempotency-key");
    if (idempotencyKey) {
      const existingIntent = await getPaymentIntentByIdempotencyKey(idempotencyKey);
      if (existingIntent) {
        return NextResponse.json({
          success: true,
          reference: existingIntent.orderReference,
          transactionReference: existingIntent.gatewayReference,
          paymentUrl: existingIntent.paymentUrl,
          status: existingIntent.responsePayload?.status ?? existingIntent.status.toUpperCase(),
          message:
            typeof existingIntent.responsePayload?.responseMessage === "string"
              ? existingIntent.responsePayload.responseMessage
              : typeof existingIntent.responsePayload?.message === "string"
                ? existingIntent.responsePayload.message
                : "Payment already initiated.",
        });
      }
    }

    const body = await req.json();
    const validation = initiatePaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0]?.message || "Invalid checkout details." },
        { status: 400 },
      );
    }

    const { items, deliveryMethod, paymentMethod, customerMobile, currencyCode, deliveryQuoteId, cardDetails } = validation.data;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: "NEXT_PUBLIC_BASE_URL must be configured." },
        { status: 500 },
      );
    }

    reference = buildOrderReference(idempotencyKey);

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const productResult = await getProductById(item.productId);
        if (!productResult.product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        if (!productResult.product.availableForSale) {
          throw new Error(`Product is unavailable for sale: ${productResult.product.name}`);
        }
        const availableQuantity = productResult.product.stockOnHand - productResult.product.reservedQuantity;
        if (
          productResult.product.inventoryManaged
          && !productResult.product.allowBackorder
          && item.quantity > Math.max(availableQuantity, 0)
        ) {
          throw new Error(`Insufficient stock for ${productResult.product.name}. Only ${Math.max(availableQuantity, 0)} available.`);
        }
        return {
          productId: item.productId,
          sku: productResult.product.sku,
          inventoryManaged: productResult.product.inventoryManaged,
          quantity: item.quantity,
          name: productResult.product.name,
          unitPrice: productResult.product.price,
          image: productResult.product.image,
        };
      }),
    );

    const settings = await getStoreSettings();
    const subtotalUsd = enrichedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const deliveryQuote = deliveryMethod === "delivery" && deliveryQuoteId
      ? await getDeliveryQuote(deliveryQuoteId)
      : null;

    if (deliveryMethod === "delivery") {
      if (!deliveryQuote) {
        return NextResponse.json({ success: false, error: "Delivery quote has expired. Please request a new quote." }, { status: 400 });
      }
      if (deliveryQuote.currencyCode !== currencyCode) {
        return NextResponse.json({ success: false, error: "Delivery quote currency does not match the selected checkout currency." }, { status: 400 });
      }
      if (deliveryQuote.address.trim() !== (validation.data.customerAddress ?? "").trim()) {
        return NextResponse.json({ success: false, error: "Delivery address changed. Please refresh the delivery quote." }, { status: 400 });
      }
      if (new Date(deliveryQuote.expiresAt).getTime() < Date.now()) {
        return NextResponse.json({ success: false, error: "Delivery quote expired. Please request a new quote." }, { status: 400 });
      }
    }

    const deliveryFeeUsd = deliveryMethod === "delivery" ? (deliveryQuote?.feeUsd ?? 0) : 0;
    const { taxTotalUsd, totalUsd } = calculateOrderTaxTotals({
      subtotalUsd,
      deliveryFeeUsd,
      taxRatePercent: settings.taxRatePercent,
      pricesIncludeTax: settings.pricesIncludeTax,
    });
    const exchangeRate = getZwgPerUsdRate();
    const subtotal = convertFromUsd(subtotalUsd, currencyCode as CurrencyCode, exchangeRate);
    const deliveryFee = convertFromUsd(deliveryFeeUsd, currencyCode as CurrencyCode, exchangeRate);
    const taxTotal = convertFromUsd(taxTotalUsd, currencyCode as CurrencyCode, exchangeRate);
    const total = convertFromUsd(totalUsd, currencyCode as CurrencyCode, exchangeRate);
    await reserveInventoryForOrder({
      orderReference: reference,
      items: enrichedItems.map(item => ({
        productId: item.productId,
        sku: item.sku,
        quantity: item.quantity,
      })),
    });
    inventoryReserved = true;

    const customerName = validation.data.customerName;
    const customerEmail = validation.data.email;
    const orderNumber = buildFinanceDocumentNumber(settings.invoicePrefix, "ORD", reference);
    const invoiceNumber = buildFinanceDocumentNumber(settings.invoicePrefix, "INV", reference);

    await createPendingOrder({
      reference,
      orderNumber,
      invoiceNumber,
      items: enrichedItems.map(item => ({
        id: item.productId,
        name: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
        image: item.image,
      })),
      subtotal,
      deliveryFee,
      taxLabel: settings.taxLabel,
      taxRatePercent: settings.taxRatePercent,
      taxTotal,
      total,
      subtotalUsd,
      deliveryFeeUsd,
      taxTotalUsd,
      totalUsd,
      exchangeRate,
      currencyCode,
      customerName,
      customerEmail,
      customerPhone: validation.data.customerPhone,
      customerAddress: validation.data.customerAddress,
      deliveryInstructions: validation.data.deliveryInstructions,
      deliveryMethod,
      deliveryZoneId: deliveryQuote?.zoneId,
      deliveryZoneName: deliveryQuote?.zoneName,
      deliveryQuoteId: deliveryQuote?.id,
      deliveryEtaMinHours: deliveryQuote?.etaMinHours,
      deliveryEtaMaxHours: deliveryQuote?.etaMaxHours,
      recipientName: validation.data.recipientName,
      recipientPhone: validation.data.recipientPhone,
      notes: validation.data.notes,
      paymentMethod: paymentMethod.toLowerCase(),
    });

    const itemName = enrichedItems.length === 1
      ? enrichedItems[0].name
      : `${enrichedItems.length} items`;

    const payload = {
      orderReference: reference,
      amount: total,
      returnUrl: `${baseUrl}/store/smile-pay/return?reference=${encodeURIComponent(reference)}`,
      resultUrl: `${baseUrl}/api/payments/webhook/smile-pay`,
      cancelUrl: `${baseUrl}/store/smile-pay/return?reference=${encodeURIComponent(reference)}&status=CANCELED`,
      failureUrl: `${baseUrl}/store/smile-pay/return?reference=${encodeURIComponent(reference)}&status=FAILED`,
      itemName,
      itemDescription: `VFS order ${reference}`,
      firstName: customerName.split(" ")[0],
      lastName: customerName.split(" ").slice(1).join(" ") || undefined,
      mobilePhoneNumber: validation.data.customerPhone,
      email: customerEmail,
    };

    await upsertPaymentIntent({
      orderReference: reference,
      provider: "smile-pay",
      paymentMethod,
      amount: total,
      currencyCode,
      idempotencyKey: idempotencyKey ?? undefined,
      status: "created",
      requestPayload: payload,
    });

    const response = await initiateSmilePayOrderPayment({
      reference,
      amount: total,
      currencyCode,
      paymentMethod,
      returnUrl: payload.returnUrl,
      resultUrl: `${baseUrl}/api/payments/webhook/smile-pay`,
      cancelUrl: payload.cancelUrl,
      failureUrl: payload.failureUrl,
      itemName: payload.itemName,
      itemDescription: payload.itemDescription,
      customerName,
      customerEmail,
      customerPhone: validation.data.customerPhone,
      customerMobile,
      cardDetails: cardDetails as CardPaymentDetails | undefined,
    });

    const gatewayStatus = response.status ?? "PENDING";
    await setOrderStatus(reference, gatewayStatus, {
      gatewayReference: response.transactionReference,
      responseCode: response.responseCode,
    });
    await upsertPaymentIntent({
      orderReference: reference,
      provider: "smile-pay",
      paymentMethod,
      amount: total,
      currencyCode,
      idempotencyKey: idempotencyKey ?? undefined,
      gatewayReference: response.transactionReference,
      paymentUrl: response.paymentUrl,
      status: mapGatewayStatusToPaymentIntent(gatewayStatus),
      requestPayload: payload,
      responsePayload: sanitizeSmilePayInitiationResultForPersistence(response),
    });

    return NextResponse.json({
      success: true,
      reference,
      transactionReference: response.transactionReference,
      paymentUrl: response.paymentUrl, // Present for CARD checkout
      redirectHtml: response.redirectHtml,
      authenticationStatus: response.authenticationStatus,
      status: gatewayStatus,
      message: response.responseMessage ?? "Payment initiated.",
    });
  } catch (error) {
    if (reference && inventoryReserved) {
      await releaseInventoryReservations(reference, "gateway_initiation_failed");
    }
    if (error instanceof SmilePayGatewayError) {
      console.error("Error initiating Smile Pay checkout:", {
        status: error.status,
        message: error.message,
        responseBody: error.responseBody,
      });
      if (reference) {
        await upsertPaymentIntent({
          orderReference: reference,
          provider: "smile-pay",
          paymentMethod: "UNKNOWN",
          amount: 0,
          idempotencyKey: idempotencyKey ?? undefined,
          status: "failed",
          responsePayload: {
            status: String(error.status),
            message: error.message,
          },
        });
      }
      return NextResponse.json(
        { success: false, error: error.message, gatewayStatus: error.status },
        { status: error.status },
      );
    }
    console.error("Error initiating Smile Pay checkout:", error);
    if (reference) {
      await upsertPaymentIntent({
        orderReference: reference,
        provider: "smile-pay",
        paymentMethod: "UNKNOWN",
        amount: 0,
        idempotencyKey: idempotencyKey ?? undefined,
        status: "failed",
        responsePayload: {
          message: error instanceof Error ? error.message : "Failed to initiate payment.",
        },
      });
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to initiate payment." },
      { status: 500 },
    );
  }
}
