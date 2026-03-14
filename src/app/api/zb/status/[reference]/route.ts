import { NextResponse } from "next/server";
import { mapGatewayStatusToPaymentIntent, upsertPaymentIntent } from "@/lib/firestore/payments";
import { releaseExpiredReservations } from "@/lib/firestore/inventory";
import { upsertDigitalOrder } from "@/lib/firestore/digital-orders";
import { queueNotification } from "@/lib/firestore/notifications";
import { checkZbStatus } from "@/lib/payments/zb";
import { setOrderStatus, getOrder } from "@/server/orders";
import { DigitalService } from "@/lib/digital-service-logic";

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
              await upsertDigitalOrder({
                orderReference,
                serviceId: "zesa",
                provider: "zb-utility",
                accountReference: meterNumber,
                customerEmail: order.customerEmail,
                customerName: order.customerName,
                provisioningStatus: "completed",
                resultPayload: vendResult.raw ?? {
                  status: "SUCCESS",
                },
                token: vendResult.token,
                receiptNumber: vendResult.receiptNumber,
                completedAt: new Date().toISOString(),
              });
              await queueNotification({
                eventKey: `digital:${orderReference}:completed`,
                type: "digital_fulfilment_completed",
                audience: "customer",
                customerEmail: order.customerEmail,
                customerName: order.customerName,
                orderReference,
                channels: ["email", "in_app"],
                subject: `Your ZESA token is ready for order ${orderReference}`,
                body: `Your ZESA purchase has been completed successfully.${vendResult.token ? ` Token: ${vendResult.token}.` : ""}${vendResult.receiptNumber ? ` Receipt: ${vendResult.receiptNumber}.` : ""}`,
                meta: {
                  serviceId: "zesa",
                  token: vendResult.token,
                  receiptNumber: vendResult.receiptNumber,
                },
              });
            }
          } catch (vendError) {
            console.error("Delayed ZESA Vending Error:", vendError);
            await upsertDigitalOrder({
              orderReference,
              serviceId: "zesa",
              provider: "zb-utility",
              accountReference: meterNumber,
              customerEmail: order.customerEmail,
              customerName: order.customerName,
              provisioningStatus: "manual_review",
              resultPayload: {
                error: vendError instanceof Error ? vendError.message : "Vend failed",
              },
            });
            await queueNotification({
              eventKey: `digital:${orderReference}:issue`,
              type: "digital_fulfilment_issue",
              audience: "customer",
              customerEmail: order.customerEmail,
              customerName: order.customerName,
              orderReference,
              channels: ["email", "in_app"],
              subject: `ZESA fulfilment needs attention for order ${orderReference}`,
              body: "Your payment was received, but token fulfilment needs manual review. Support has enough information to investigate.",
              meta: {
                serviceId: "zesa",
                error: vendError instanceof Error ? vendError.message : "Vend failed",
              },
            });
            // We don't fail the whole status check, just log the vend error
            // The user can retry later or support can handle it
          }
        } else if (isZesa && order.paymentMeta?.token) {
          vendedData = {
            token: order.paymentMeta.token,
            units: order.paymentMeta.units,
            receiptNumber: order.paymentMeta.receiptNumber,
          };
          await upsertDigitalOrder({
            orderReference,
            serviceId: "zesa",
            provider: "zb-utility",
            accountReference: typeof order.paymentMeta?.accountNumber === "string"
              ? order.paymentMeta.accountNumber
              : order.items[0].id.split("zesa-")[1],
            customerEmail: order.customerEmail,
            customerName: order.customerName,
            provisioningStatus: "completed",
            resultPayload: {
              status: "SUCCESS",
            },
            token: String(order.paymentMeta.token),
            receiptNumber: typeof order.paymentMeta.receiptNumber === "string" ? order.paymentMeta.receiptNumber : undefined,
            completedAt: typeof order.paymentMeta.vendedAt === "string" ? order.paymentMeta.vendedAt : new Date().toISOString(),
          });
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
