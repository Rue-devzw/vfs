import { NextResponse } from "next/server";
import { z } from "zod";
import {
  confirmEcocashExpress,
  confirmInnbucksExpress,
  confirmOmariExpress,
  confirmOneMoneyExpress,
  confirmSmileCashExpress,
} from "@/lib/payments/zb";
import { mapGatewayStatusToPaymentIntent, upsertPaymentIntent } from "@/lib/firestore/payments";
import { setOrderStatus } from "@/server/orders";
import { PAYMENT_METHOD_VALUES } from "@/lib/payment-methods";

const confirmSchema = z.object({
  reference: z.string().min(1),
  transactionReference: z.string().min(1),
  otp: z.string().trim().min(4),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES).default("WALLETPLUS"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = confirmSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
    }

    const { reference, transactionReference, otp, paymentMethod } = validation.data;

    let result;
    switch (paymentMethod) {
      case "ECOCASH":
        result = await confirmEcocashExpress({ otp, transactionReference });
        break;
      case "INNBUCKS":
        result = await confirmInnbucksExpress({ otp, transactionReference });
        break;
      case "OMARI":
        result = await confirmOmariExpress({ otp, transactionReference });
        break;
      case "ONEMONEY":
        result = await confirmOneMoneyExpress({ otp, transactionReference });
        break;
      case "WALLETPLUS":
        result = await confirmSmileCashExpress({ otp, transactionReference });
        break;
      case "CARD":
        return NextResponse.json(
          { success: false, error: "Card payments do not use OTP confirmation on this route." },
          { status: 400 },
        );
      default:
        return NextResponse.json(
          { success: false, error: `Unsupported payment method: ${paymentMethod}` },
          { status: 400 },
        );
    }

    await setOrderStatus(reference, result.status ?? "PENDING", {
      gatewayReference: result.transactionReference ?? transactionReference,
      responseCode: result.responseCode,
    });
    await upsertPaymentIntent({
      orderReference: reference,
      provider: "zb",
      paymentMethod,
      gatewayReference: result.transactionReference ?? transactionReference,
      status: mapGatewayStatusToPaymentIntent(result.status ?? "PENDING"),
      responsePayload: result as Record<string, unknown>,
    });

    return NextResponse.json({
      success: true,
      reference,
      transactionReference: result.transactionReference ?? transactionReference,
      status: result.status ?? "PENDING",
      message: result.responseMessage ?? "Payment confirmation submitted.",
    });
  } catch (error) {
    console.error("Error confirming ZB express payment:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to confirm payment." },
      { status: 500 },
    );
  }
}
