import { NextResponse } from "next/server";
import { z } from "zod";
import { initiateZbWalletExpress, ZbGatewayError } from "@/lib/payments/zb";
import { createPendingOrder, setOrderStatus } from "@/server/orders";
import { DIGITAL_SERVICE_LABELS, isDigitalServiceId } from "@/lib/digital-services";
import { convertFromUsd, CurrencyCode, getZwgPerUsdRate } from "@/lib/currency";

const schema = z.object({
  service: z.string().min(1),
  accountReference: z.string().trim().min(2),
  amount: z.number().min(1),
  zbWalletMobile: z.string().trim().min(8),
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

    const { service, accountReference, amount: amountUsd, zbWalletMobile, currencyCode } = validation.data;
    if (!isDigitalServiceId(service) || service === "zesa") {
      return NextResponse.json({ success: false, error: "Unsupported digital service." }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: "NEXT_PUBLIC_BASE_URL must be configured." }, { status: 500 });
    }

    const reference = `DIG-${service.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const label = DIGITAL_SERVICE_LABELS[service];
    const customerName = validation.data.customerName || "Digital Customer";
    const customerEmail = validation.data.customerEmail || "customer@example.com";

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
      customerPhone: zbWalletMobile,
      paymentMethod: "zb-walletplus",
      notes: `${label} account: ${accountReference}`,
    });

    const result = await initiateZbWalletExpress({
      orderReference: reference,
      amount,
      resultUrl: `${baseUrl}/api/zb/webhook`,
      returnUrl: `${baseUrl}/digital/${service}?reference=${encodeURIComponent(reference)}`,
      cancelUrl: `${baseUrl}/digital/${service}?status=CANCELED&reference=${encodeURIComponent(reference)}`,
      failureUrl: `${baseUrl}/digital/${service}?status=FAILED&reference=${encodeURIComponent(reference)}`,
      itemName: `${label} Payment`,
      itemDescription: `${label} - ${accountReference}`,
      currencyCode,
      firstName: customerName.split(" ")[0],
      lastName: customerName.split(" ").slice(1).join(" ") || undefined,
      mobilePhoneNumber: zbWalletMobile,
      email: customerEmail,
      zbWalletMobile,
    });

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
    console.error("Digital service payment initiation failed:", error);
    if (error instanceof ZbGatewayError) {
      return NextResponse.json(
        { success: false, error: error.message, gatewayStatus: error.status },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to initiate digital payment." },
      { status: 500 },
    );
  }
}
