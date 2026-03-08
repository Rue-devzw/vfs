import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingOrder, setOrderStatus } from "@/server/orders";
import { getProductById } from "@/lib/firestore/products";
import { convertFromUsd, CurrencyCode, getZwgPerUsdRate } from "@/lib/currency";
import {
  initiateSmileCashExpress,
  initiateEcocashExpress,
  initiateInnbucksExpress,
  initiateOmariExpress,
  initiateZbStandardCheckout,
  type ZbCheckoutResponse,
  ZbGatewayError,
} from "@/lib/payments/zb";

const BIKER_DELIVERY_FEE = 5;

const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

const initiatePaymentSchema = z.object({
  email: z.string().email(),
  customerMobile: z.string().trim().min(8).optional(), // Renamed for clarity across providers
  paymentMethod: z.enum(["WALLETPLUS", "ECOCASH", "INNBUCKS", "CARD", "OMARI", "ONEMONEY"]).default("WALLETPLUS"),
  currencyCode: z.enum(["840", "924"]).default("840"),
  deliveryMethod: z.enum(["collect", "delivery"]).default("collect"),
  customerName: z.string().trim().min(2),
  customerPhone: z.string().trim().min(7),
  customerAddress: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(500).optional(),
  items: z.array(checkoutItemSchema).min(1),
}).superRefine((data, ctx) => {
  if (data.deliveryMethod === "delivery" && !data.customerAddress) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Customer address is required for delivery orders.",
      path: ["customerAddress"],
    });
  }
  if (data.paymentMethod !== "CARD" && !data.customerMobile) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Customer mobile is required for express payment methods.",
      path: ["customerMobile"],
    });
  }
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = initiatePaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
    }

    const { items, deliveryMethod, paymentMethod, customerMobile, currencyCode } = validation.data;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: "NEXT_PUBLIC_BASE_URL must be configured." },
        { status: 500 },
      );
    }

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const productResult = await getProductById(item.productId);
        if (!productResult.product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        return {
          productId: item.productId,
          quantity: item.quantity,
          name: productResult.product.name,
          unitPrice: productResult.product.price,
          image: productResult.product.image,
        };
      }),
    );

    const subtotalUsd = enrichedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const deliveryFeeUsd = deliveryMethod === "delivery" ? BIKER_DELIVERY_FEE : 0;
    const totalUsd = Number((subtotalUsd + deliveryFeeUsd).toFixed(2));
    const exchangeRate = getZwgPerUsdRate();
    const subtotal = convertFromUsd(subtotalUsd, currencyCode as CurrencyCode, exchangeRate);
    const deliveryFee = convertFromUsd(deliveryFeeUsd, currencyCode as CurrencyCode, exchangeRate);
    const total = convertFromUsd(totalUsd, currencyCode as CurrencyCode, exchangeRate);
    const reference = `order_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const customerName = validation.data.customerName;
    const customerEmail = validation.data.email;

    await createPendingOrder({
      reference,
      items: enrichedItems.map(item => ({
        id: item.productId,
        name: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
        image: item.image,
      })),
      subtotal,
      deliveryFee,
      total,
      subtotalUsd,
      deliveryFeeUsd,
      totalUsd,
      exchangeRate,
      currencyCode,
      customerName,
      customerEmail,
      customerPhone: validation.data.customerPhone,
      customerAddress: validation.data.customerAddress,
      notes: validation.data.notes,
      paymentMethod: paymentMethod.toLowerCase(),
    });

    const itemName = enrichedItems.length === 1
      ? enrichedItems[0].name
      : `${enrichedItems.length} items`;

    const payload = {
      orderReference: reference,
      amount: total,
      returnUrl: `${baseUrl}/store/zb/return?reference=${encodeURIComponent(reference)}`,
      resultUrl: `${baseUrl}/api/zb/webhook`,
      cancelUrl: `${baseUrl}/store/zb/return?reference=${encodeURIComponent(reference)}&status=CANCELED`,
      failureUrl: `${baseUrl}/store/zb/return?reference=${encodeURIComponent(reference)}&status=FAILED`,
      itemName,
      itemDescription: `VFS order ${reference}`,
      firstName: customerName.split(" ")[0],
      lastName: customerName.split(" ").slice(1).join(" ") || undefined,
      mobilePhoneNumber: validation.data.customerPhone,
      email: customerEmail,
    };

    let response: ZbCheckoutResponse;
    if (paymentMethod === "CARD") {
      response = await initiateZbStandardCheckout({ ...payload, currencyCode, paymentMethod: "CARD" });
    } else {
      if (!customerMobile) throw new Error(`${paymentMethod} requires a mobile number.`);
      const expressPayload = { ...payload, currencyCode, customerMobile };

      switch (paymentMethod) {
        case "ECOCASH": response = await initiateEcocashExpress(expressPayload); break;
        case "INNBUCKS": response = await initiateInnbucksExpress(expressPayload); break;
        case "OMARI": response = await initiateOmariExpress(expressPayload); break;
        case "WALLETPLUS": response = await initiateSmileCashExpress(expressPayload); break;
        default: throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }
    }

    const gatewayStatus = response.status ?? "PENDING";
    await setOrderStatus(reference, gatewayStatus, {
      gatewayReference: response.transactionReference,
      responseCode: response.responseCode,
    });

    return NextResponse.json({
      success: true,
      reference,
      transactionReference: response.transactionReference,
      paymentUrl: response.paymentUrl, // Present for CARD checkout
      status: gatewayStatus,
      message: response.responseMessage ?? "Payment initiated.",
    });
  } catch (error) {
    console.error("Error initiating ZB checkout:", error);
    if (error instanceof ZbGatewayError) {
      return NextResponse.json(
        { success: false, error: error.message, gatewayStatus: error.status },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to initiate payment." },
      { status: 500 },
    );
  }
}
