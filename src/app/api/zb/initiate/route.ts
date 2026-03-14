import { NextResponse } from "next/server";
import { z } from "zod";
import { initiateZbWalletExpress, ZbGatewayError } from "@/lib/payments/zb";
import { createPendingOrder, setOrderStatus } from "@/server/orders";
import { convertFromUsd, CurrencyCode, getZwgPerUsdRate } from "@/lib/currency";

const initiateZBSchema = z.object({
  meterNumber: z.string().min(1, "Meter number is required"),
  amount: z.number().min(2, "Minimum amount is $2.00"),
  zbWalletMobile: z.string().trim().min(8, "Wallet mobile is required"),
  currencyCode: z.enum(["840", "924"]).default("840"),
  customerName: z.string().trim().optional(),
  customerEmail: z.string().email().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = initiateZBSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
    }

    const { meterNumber, amount: amountUsd, zbWalletMobile, currencyCode } = validation.data;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: "NEXT_PUBLIC_BASE_URL must be configured." },
        { status: 500 },
      );
    }

    const reference = `ZB-ZESA-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const customerName = validation.data.customerName || "Digital Customer";
    const customerEmail = validation.data.customerEmail || "customer@example.com";

    const exchangeRate = getZwgPerUsdRate();
    const amount = convertFromUsd(amountUsd, currencyCode as CurrencyCode, exchangeRate);

    await createPendingOrder({
      reference,
      items: [{
        id: `zesa-${meterNumber}`,
        name: "ZESA Token Purchase",
        price: amount,
        quantity: 1,
        image: "/images/Zesa.webp",
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
      deliveryMethod: "collect",
      paymentMethod: "zb-walletplus",
      notes: `Meter: ${meterNumber}`,
    });

    const response = await initiateZbWalletExpress({
      orderReference: reference,
      amount,
      itemName: "ZESA Prepaid Token",
      itemDescription: `Meter ${meterNumber}`,
      currencyCode,
      returnUrl: `${baseUrl}/digital/zesa?reference=${encodeURIComponent(reference)}`,
      resultUrl: `${baseUrl}/api/zb/webhook`,
      cancelUrl: `${baseUrl}/digital/zesa?status=CANCELED&reference=${encodeURIComponent(reference)}`,
      failureUrl: `${baseUrl}/digital/zesa?status=FAILED&reference=${encodeURIComponent(reference)}`,
      firstName: customerName.split(" ")[0],
      lastName: customerName.split(" ").slice(1).join(" ") || undefined,
      mobilePhoneNumber: zbWalletMobile,
      email: customerEmail,
      zbWalletMobile,
    });

    await setOrderStatus(reference, response.status ?? "PENDING", {
      gatewayReference: response.transactionReference,
      responseCode: response.responseCode,
      meterNumber,
    });

    return NextResponse.json({
      success: true,
      reference,
      transactionReference: response.transactionReference,
      status: response.status ?? "PENDING",
      message: response.responseMessage ?? "OTP sent. Confirm payment to complete purchase.",
    });
  } catch (error) {
    console.error("Error initiating ZB payment:", error);
    if (error instanceof ZbGatewayError) {
      return NextResponse.json(
        { success: false, error: error.message, gatewayStatus: error.status },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to initiate ZB payment." },
      { status: 500 },
    );
  }
}
