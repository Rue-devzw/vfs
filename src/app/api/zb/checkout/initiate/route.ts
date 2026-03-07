import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingOrder, setOrderStatus } from "@/server/orders";
import { getProductById } from "@/lib/firestore/products";
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
  email: z.string().email().optional(),
  customerMobile: z.string().trim().min(8).optional(), // Renamed for clarity across providers
  paymentMethod: z.enum(["WALLETPLUS", "ECOCASH", "INNBUCKS", "CARD", "OMARI", "ONEMONEY"]).default("WALLETPLUS"),
  deliveryMethod: z.enum(["collect", "delivery"]).default("collect"),
  customerName: z.string().trim().min(1).optional(),
  customerPhone: z.string().trim().min(1).optional(),
  customerAddress: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(500).optional(),
  items: z.array(checkoutItemSchema).min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = initiatePaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
    }

    const { items, deliveryMethod, paymentMethod, customerMobile } = validation.data;
    const defaultCurrency = process.env.ZB_CURRENCY_CODE?.trim() || "USD";
    const expressCurrency = process.env.ZB_EXPRESS_CURRENCY_CODE?.trim() || defaultCurrency;
    const cardCurrency = process.env.ZB_CARD_CURRENCY_CODE?.trim() || defaultCurrency;
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

    const subtotal = enrichedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const deliveryFee = deliveryMethod === "delivery" ? BIKER_DELIVERY_FEE : 0;
    const total = Number((subtotal + deliveryFee).toFixed(2));
    const reference = `order_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const customerName = validation.data.customerName ?? "Guest";
    const customerEmail = validation.data.email ?? "customer@example.com";

    await createPendingOrder({
      reference,
      items: enrichedItems.map(item => ({
        id: item.productId,
        name: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
        image: item.image,
      })),
      subtotal: Number(subtotal.toFixed(2)),
      deliveryFee,
      total,
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
      response = await initiateZbStandardCheckout({ ...payload, currencyCode: cardCurrency, paymentMethod: "CARD" });
    } else {
      if (!customerMobile) throw new Error(`${paymentMethod} requires a mobile number.`);
      const expressPayload = { ...payload, currencyCode: expressCurrency, customerMobile };

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
