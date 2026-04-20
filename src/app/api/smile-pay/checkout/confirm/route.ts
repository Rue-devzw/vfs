import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmSmilePayOrderPayment } from "@/lib/payments/smile-pay-service";
import { PAYMENT_METHOD_VALUES } from "@/lib/payment-methods";
import { SmilePayGatewayError } from "@/lib/payments/smile-pay";

const confirmSchema = z.object({
  reference: z.string().min(1),
  transactionReference: z.string().min(1),
  otp: z.string().trim().min(4),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES).default("WALLETPLUS"),
  customerMobile: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = confirmSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
    }

    const { reference, transactionReference, otp, paymentMethod, customerMobile } = validation.data;
    if (paymentMethod === "CARD") {
      return NextResponse.json(
        { success: false, error: "Card payments do not use OTP confirmation on this route." },
        { status: 400 },
      );
    }

    const result = await confirmSmilePayOrderPayment({
      reference,
      transactionReference,
      otp,
      paymentMethod,
      customerMobile,
    });

    return NextResponse.json({
      success: true,
      reference,
      transactionReference: result.transactionReference ?? transactionReference,
      status: result.status ?? "PENDING",
      message: result.responseMessage ?? "Payment confirmation submitted.",
    });
  } catch (error) {
    if (error instanceof SmilePayGatewayError) {
      console.error("Error confirming Smile Pay express payment:", {
        status: error.status,
        message: error.message,
        responseBody: error.responseBody,
      });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status >= 400 && error.status < 500 ? error.status : 502 },
      );
    }
    console.error("Error confirming Smile Pay express payment:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to confirm payment." },
      { status: 500 },
    );
  }
}
