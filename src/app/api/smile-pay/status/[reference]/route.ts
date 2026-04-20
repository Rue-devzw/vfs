import { NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/firestore/inventory";
import { buildSmilePayStatusSummary, syncSmilePayOrderStatus } from "@/lib/payments/smile-pay-service";

type RouteContext = {
  params: Promise<{ reference: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    await releaseExpiredReservations();

    const { reference } = await context.params;
    const orderReference = decodeURIComponent(reference);
    const { statusResult, order, fulfilmentResult } = await syncSmilePayOrderStatus(orderReference);

    return NextResponse.json({
      success: true,
      data: buildSmilePayStatusSummary({
        reference: orderReference,
        statusResult,
        order,
        vendedData: fulfilmentResult?.vendedData,
      }),
    });
  } catch (error) {
    console.error("Failed to check Smile Pay status:", error);
    return NextResponse.json(
      { success: false, error: "Unable to check payment status" },
      { status: 500 },
    );
  }
}
