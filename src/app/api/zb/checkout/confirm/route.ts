import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmSmileCashExpress, confirmOmariExpress } from "@/lib/payments/zb";
import { setOrderStatus } from "@/server/orders";

const confirmSchema = z.object({
  reference: z.string().min(1),
  transactionReference: z.string().min(1),
  otp: z.string().trim().min(4),
  paymentMethod: z.enum(["WALLETPLUS", "OMARI"]).default("WALLETPLUS"),
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
    if (paymentMethod === "OMARI") {
      result = await confirmOmariExpress({ otp, transactionReference });
    } else {
      result = await confirmSmileCashExpress({ otp, transactionReference });
    }

    await setOrderStatus(reference, result.status ?? "PENDING", {
      gatewayReference: result.transactionReference ?? transactionReference,
      responseCode: result.responseCode,
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
