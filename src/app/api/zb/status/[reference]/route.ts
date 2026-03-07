import { NextResponse } from "next/server";
import { checkZbStatus } from "@/lib/payments/zb";
import { setOrderStatus } from "@/server/orders";

type RouteContext = {
  params: Promise<{ reference: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { reference } = await context.params;
    const orderReference = decodeURIComponent(reference);

    const statusResult = await checkZbStatus(orderReference);
    const status = statusResult.status ?? "PENDING";

    await setOrderStatus(orderReference, status, {
      gatewayReference: statusResult.reference,
      paymentOption: statusResult.paymentOption,
      amount: statusResult.amount,
      currency: statusResult.currency,
    });

    return NextResponse.json({
      success: true,
      data: {
        reference: orderReference,
        status,
        paymentOption: statusResult.paymentOption,
      },
    });
  } catch (error) {
    console.error("Failed to check ZB status:", error);
    return NextResponse.json(
      { success: false, error: "Unable to check payment status" },
      { status: 500 },
    );
  }
}
