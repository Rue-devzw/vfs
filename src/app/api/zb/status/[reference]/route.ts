import { NextResponse } from "next/server";
import { getDigitalServiceConfig, isDigitalServiceId, type DigitalServiceId } from "@/lib/digital-services";
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
    const order = await getOrder(orderReference);
    const fallbackDigitalServiceId = order?.items?.[0]?.id
      ? String(order.items[0].id).split("-")[0]?.toLowerCase()
      : null;

    const statusResult = await checkZbStatus(orderReference);
    const status = statusResult.status ?? "PENDING";
    const paymentMeta = order?.paymentMeta ?? {};
    const digitalServiceId: DigitalServiceId | null = order?.paymentMeta
      && typeof order.paymentMeta.serviceType === "string"
      && isDigitalServiceId(String(order.paymentMeta.serviceType).toLowerCase())
      ? (String(order.paymentMeta.serviceType).toLowerCase() as DigitalServiceId)
      : fallbackDigitalServiceId && isDigitalServiceId(fallbackDigitalServiceId)
        ? fallbackDigitalServiceId
      : null;
    const digitalConfig = digitalServiceId ? getDigitalServiceConfig(digitalServiceId) : null;
    const serviceMeta = order?.paymentMeta && typeof order.paymentMeta.serviceMeta === "object" && order.paymentMeta.serviceMeta !== null
      ? Object.fromEntries(
        Object.entries(order.paymentMeta.serviceMeta as Record<string, unknown>)
          .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      )
      : undefined;

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
    let vendedData = null;
    if (status === "SUCCESS") {
      if (order) {
        if (digitalServiceId && digitalConfig) {
          const accountReference = typeof paymentMeta.accountNumber === "string"
            ? paymentMeta.accountNumber
            : order.items?.[0]?.id?.split(`${digitalServiceId}-`)[1] ?? "unknown";
          const amountUsd = order.totalUsd || order.total;
          const alreadyCompleted = Boolean(paymentMeta.receiptNumber || paymentMeta.token);

          if (!alreadyCompleted) {
            const serviceType = digitalServiceId.toUpperCase() as Uppercase<DigitalServiceId>;
          try {
            const vendResult = await DigitalService.vendDigitalFulfilment(serviceType, {
              orderReference,
              accountNumber: accountReference,
              amountUsd,
              serviceMeta: {
                ...(serviceMeta ?? {}),
                customerName: order.customerName,
                customerMobile: order.customerPhone ?? "",
                currencyCode: order.currencyCode ?? "840",
              },
            });
            if (vendResult.success) {
              vendedData = {
                token: vendResult.token,
                units: vendResult.units,
                receiptNumber: vendResult.receiptNumber,
                message: vendResult.message,
              };

              await setOrderStatus(orderReference, "SUCCESS", {
                ...order.paymentMeta,
                ...vendedData,
                vendedAt: new Date().toISOString(),
                accountNumber: accountReference,
                serviceType,
                serviceMeta,
              });
              await upsertDigitalOrder({
                orderReference,
                serviceId: digitalServiceId,
                provider: digitalConfig.provider,
                accountReference,
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
                subject: `Your ${digitalConfig.label} request is complete for order ${orderReference}`,
                body: `Your ${digitalConfig.label} request has been completed successfully.${vendResult.token ? ` Token: ${vendResult.token}.` : ""}${vendResult.receiptNumber ? ` Receipt: ${vendResult.receiptNumber}.` : ""}`,
                meta: {
                  serviceId: digitalServiceId,
                  token: vendResult.token,
                  receiptNumber: vendResult.receiptNumber,
                },
              });
            }
          } catch (vendError) {
            console.error("Digital fulfilment error:", vendError);
            await upsertDigitalOrder({
              orderReference,
              serviceId: digitalServiceId,
              provider: digitalConfig.provider,
              accountReference,
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
              subject: `${digitalConfig.label} fulfilment needs attention for order ${orderReference}`,
              body: `Your payment was received, but ${digitalConfig.label} fulfilment needs manual review. Support has enough information to investigate.`,
              meta: {
                serviceId: digitalServiceId,
                error: vendError instanceof Error ? vendError.message : "Vend failed",
              },
            });
          }
          } else {
              vendedData = {
                token: paymentMeta.token,
                units: paymentMeta.units,
                receiptNumber: paymentMeta.receiptNumber,
            message: typeof paymentMeta.narrative === "string" ? paymentMeta.narrative : undefined,
              };
          await upsertDigitalOrder({
            orderReference,
            serviceId: digitalServiceId,
            provider: digitalConfig.provider,
            accountReference,
            customerEmail: order.customerEmail,
            customerName: order.customerName,
            provisioningStatus: "completed",
            resultPayload: {
              status: "SUCCESS",
            },
            token: typeof paymentMeta.token === "string" ? paymentMeta.token : undefined,
            receiptNumber: typeof paymentMeta.receiptNumber === "string" ? paymentMeta.receiptNumber : undefined,
            completedAt: typeof paymentMeta.vendedAt === "string" ? paymentMeta.vendedAt : new Date().toISOString(),
          });
          }
        }
      }
    } else if (digitalServiceId && digitalConfig && ["FAILED", "CANCELED", "CANCELLED", "EXPIRED"].includes(status)) {
      await upsertDigitalOrder({
        orderReference,
        serviceId: digitalServiceId,
        provider: digitalConfig.provider,
        accountReference: typeof order?.paymentMeta?.accountNumber === "string"
          ? order.paymentMeta.accountNumber
          : order?.items?.[0]?.id?.split(`${digitalServiceId}-`)[1] ?? "unknown",
        customerEmail: order?.customerEmail,
        customerName: order?.customerName,
        provisioningStatus: "failed",
        resultPayload: {
          status,
          transactionReference: statusResult.reference,
        },
      });
    }

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
