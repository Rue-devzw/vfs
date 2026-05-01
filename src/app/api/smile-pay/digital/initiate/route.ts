import { NextResponse } from "next/server";
import { z } from "zod";
import { initiateSmileCashExpress, SmilePayGatewayError } from "@/lib/payments/smile-pay";
import { normalizeSmilePayInitiationResult } from "@/lib/payments/smile-pay-service";
import { createPendingOrder, setOrderStatus } from "@/server/orders";
import { getDigitalServiceConfig, isDigitalServiceId } from "@/lib/digital-services";
import { convertFromUsd, CurrencyCode, getZwgPerUsdRate } from "@/lib/currency";
import { verifyCustomerSession } from "@/lib/auth";

const schema = z.object({
  service: z.string().min(1),
  accountReference: z.string().trim().min(2),
  amount: z.number().min(1),
  smilePayMobile: z.string().trim().min(8),
  currencyCode: z.enum(["840", "924"]).default("840"),
  customerEmail: z.string().email().optional(),
  customerName: z.string().trim().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
    }

    const { service, accountReference, amount: amountUsd, smilePayMobile, currencyCode } = validation.data;
    const customerSession = await verifyCustomerSession();
    if (!isDigitalServiceId(service) || service === "zesa") {
      return NextResponse.json({ success: false, error: "Unsupported digital service." }, { status: 400 });
    }
    const serviceConfig = getDigitalServiceConfig(service);
    if (!serviceConfig || serviceConfig.purchaseMode !== "provider") {
      return NextResponse.json(
        { success: false, error: serviceConfig?.supportMessage || "Digital service is not available yet." },
        { status: 501 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: "NEXT_PUBLIC_BASE_URL must be configured." }, { status: 500 });
    }

    const reference = `DIG-${service.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const label = serviceConfig.label;
    const customerName = validation.data.customerName || customerSession?.name || "Digital Customer";
    const customerEmail = (validation.data.customerEmail || customerSession?.email || "customer@example.com").toLowerCase();

    const exchangeRate = getZwgPerUsdRate();
    const amount = convertFromUsd(amountUsd, currencyCode as CurrencyCode, exchangeRate);

    await createPendingOrder({
      reference,
      items: [{
        id: `${service}-${accountReference}`,
        name: `${label} Payment`,
        price: amount,
        quantity: 1,
        image: "/images/logo.webp",
      }],
      subtotal: amount,
      deliveryFee: 0,
      total: amount,
      subtotalUsd: amountUsd,
      deliveryFeeUsd: 0,
      totalUsd: amountUsd,
      exchangeRate,
      currencyCode: currencyCode as CurrencyCode,
      customerName,
      customerEmail,
      customerPhone: smilePayMobile,
      deliveryMethod: "collect",
      paymentMethod: "smile-pay-walletplus",
      notes: `${label} account: ${accountReference}`,
    });

    const initiationResponse = await initiateSmileCashExpress({
      orderReference: reference,
      amount,
      resultUrl: `${baseUrl}/api/payments/webhook/smile-pay`,
      returnUrl: `${baseUrl}/digital/${service}?reference=${encodeURIComponent(reference)}`,
      cancelUrl: `${baseUrl}/digital/${service}?status=CANCELED&reference=${encodeURIComponent(reference)}`,
      failureUrl: `${baseUrl}/digital/${service}?status=FAILED&reference=${encodeURIComponent(reference)}`,
      itemName: `${label} Payment`,
      itemDescription: `${label} - ${accountReference}`,
      currencyCode,
      firstName: customerName.split(" ")[0],
      lastName: customerName.split(" ").slice(1).join(" ") || undefined,
      mobilePhoneNumber: smilePayMobile,
      email: customerEmail,
      zbWalletMobile: smilePayMobile,
    });
    const result = normalizeSmilePayInitiationResult("WALLETPLUS", initiationResponse);

    await setOrderStatus(reference, result.status ?? "PENDING", {
      gatewayReference: result.transactionReference,
      responseCode: result.responseCode,
      service,
      accountReference,
    });

    return NextResponse.json({
      success: true,
      reference,
      transactionReference: result.transactionReference,
      status: result.status ?? "PENDING",
      message: result.responseMessage ?? "OTP sent. Confirm payment.",
    });
  } catch (error) {
    if (error instanceof SmilePayGatewayError) {
      console.error("Digital service payment initiation failed:", {
        status: error.status,
        message: error.message,
        responseBody: error.responseBody,
      });
      return NextResponse.json(
        { success: false, error: error.message, gatewayStatus: error.status },
        { status: error.status },
      );
    }
    console.error("Digital service payment initiation failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to initiate digital payment." },
      { status: 500 },
    );
  }
}
