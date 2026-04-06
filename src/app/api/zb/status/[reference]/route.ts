import { NextResponse } from "next/server";
import { mapGatewayStatusToPaymentIntent, upsertPaymentIntent } from "@/lib/firestore/payments";
import { releaseExpiredReservations } from "@/lib/firestore/inventory";
import { checkZbStatus } from "@/lib/payments/zb";
import { setOrderStatus, getOrder } from "@/server/orders";
import { syncDigitalFulfilmentForOrder } from "@/lib/digital-fulfilment";

type RouteContext = {
  params: Promise<{ reference: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    await releaseExpiredReservations();

    const { reference } = await context.params;
    const orderReference = decodeURIComponent(reference);
    const statusResult = await checkZbStatus(orderReference);
    const status = statusResult.status ?? "PENDING";
    const existingOrder = await getOrder(orderReference);

    // 1. Update basic payment status
    await setOrderStatus(orderReference, status, {
      gatewayReference: statusResult.reference,
      paymentOption: statusResult.paymentOption,
      amount: statusResult.amount,
      currency: statusResult.currency,
    });
    await upsertPaymentIntent({
      orderReference,
      provider: "zb",
      paymentMethod: statusResult.paymentOption ?? "UNKNOWN",
      gatewayReference: statusResult.reference,
      status: mapGatewayStatusToPaymentIntent(status),
      responsePayload: statusResult as Record<string, unknown>,
    });

    // 2. Handle digital fulfilment if successful and not already posted
    const fulfilmentResult = await syncDigitalFulfilmentForOrder(orderReference, status);
    const order = fulfilmentResult.order ?? existingOrder;
    const vendedData = fulfilmentResult.vendedData;

    return NextResponse.json({
      success: true,
      data: {
        reference: orderReference,
        status,
        paymentOption: statusResult.paymentOption,
        amount: order?.totalUsd ?? order?.total ?? statusResult.amount,
        transactionReference: statusResult.reference,
        accountReference: typeof order?.paymentMeta?.accountNumber === "string"
          ? order.paymentMeta.accountNumber
          : undefined,
        meterNumber: order?.items?.[0]?.id?.startsWith?.("zesa-")
          ? String(order.items[0].id).split("zesa-")[1]
          : undefined,
        ...(vendedData && { vendedData }),
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
