import { NextResponse } from "next/server";
import { checkZbStatus } from "@/lib/payments/zb";
import { setOrderStatus, getOrder } from "@/server/orders";
import { DigitalService } from "@/lib/digital-service-logic";

type RouteContext = {
  params: Promise<{ reference: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { reference } = await context.params;
    const orderReference = decodeURIComponent(reference);

    const statusResult = await checkZbStatus(orderReference);
    const status = statusResult.status ?? "PENDING";

    // 1. Update basic payment status
    await setOrderStatus(orderReference, status, {
      gatewayReference: statusResult.reference,
      paymentOption: statusResult.paymentOption,
      amount: statusResult.amount,
      currency: statusResult.currency,
    });

    // 2. Handle ZESA Vending if successful and not already vended
    let vendedData = null;
    if (status === "SUCCESS") {
      const order = await getOrder(orderReference);
      if (order) {
        const isZesa = order.items?.some(item => item.id.startsWith("zesa-"));

        if (isZesa && !order.paymentMeta?.token) {
          const meterNumber = typeof order.paymentMeta?.accountNumber === "string"
            ? order.paymentMeta.accountNumber
            : order.items[0].id.split("zesa-")[1];
          const amountUsd = order.totalUsd || order.total; // Use total as fallback

          try {
            const vendResult = await DigitalService.vendZesaToken(orderReference, meterNumber, amountUsd);
            if (vendResult.success) {
              vendedData = {
                token: vendResult.token,
                units: vendResult.units,
                receiptNumber: vendResult.receiptNumber,
              };

              // Update order with vended token details
              await setOrderStatus(orderReference, "SUCCESS", {
                ...order.paymentMeta,
                ...vendedData,
                vendedAt: new Date().toISOString(),
              });
            }
          } catch (vendError) {
            console.error("Delayed ZESA Vending Error:", vendError);
            // We don't fail the whole status check, just log the vend error
            // The user can retry later or support can handle it
          }
        } else if (isZesa && order.paymentMeta?.token) {
          vendedData = {
            token: order.paymentMeta.token,
            units: order.paymentMeta.units,
            receiptNumber: order.paymentMeta.receiptNumber,
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        reference: orderReference,
        status,
        paymentOption: statusResult.paymentOption,
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
