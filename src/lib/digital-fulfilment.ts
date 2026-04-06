import { DigitalService } from "@/lib/digital-service-logic";
import { getDigitalServiceConfig, isDigitalServiceId, type DigitalServiceId } from "@/lib/digital-services";
import { upsertDigitalOrder } from "@/lib/firestore/digital-orders";
import { queueNotification } from "@/lib/firestore/notifications";
import type { Order } from "@/lib/firestore/orders";
import { getOrder, setOrderStatus } from "@/server/orders";

type OrderWithPaymentMeta = Order & { paymentMeta?: Record<string, unknown> };

export type DigitalVendedData = {
  token?: string;
  units?: number;
  receiptNumber?: string;
  message?: string;
};

const SUCCESSFUL_GATEWAY_STATUSES = new Set(["PAID", "SUCCESS"]);
const FAILED_GATEWAY_STATUSES = new Set(["FAILED", "CANCELED", "CANCELLED", "EXPIRED"]);

function extractServiceMeta(order: OrderWithPaymentMeta) {
  if (!order.paymentMeta || typeof order.paymentMeta.serviceMeta !== "object" || order.paymentMeta.serviceMeta === null) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(order.paymentMeta.serviceMeta as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function extractDigitalServiceId(order: OrderWithPaymentMeta): DigitalServiceId | null {
  const paymentMetaServiceType = order.paymentMeta && typeof order.paymentMeta.serviceType === "string"
    ? String(order.paymentMeta.serviceType).toLowerCase()
    : null;
  if (paymentMetaServiceType && isDigitalServiceId(paymentMetaServiceType)) {
    return paymentMetaServiceType;
  }

  const fallback = order.items?.[0]?.id
    ? String(order.items[0].id).split("-")[0]?.toLowerCase()
    : null;

  return fallback && isDigitalServiceId(fallback) ? fallback : null;
}

export async function syncDigitalFulfilmentForOrder(orderReference: string, gatewayStatus: string) {
  const status = gatewayStatus.toUpperCase();
  const order = await getOrder(orderReference);
  if (!order) {
    return { order: null, digitalServiceId: null, vendedData: null as DigitalVendedData | null };
  }

  const digitalServiceId = extractDigitalServiceId(order);
  if (!digitalServiceId) {
    return { order, digitalServiceId: null, vendedData: null as DigitalVendedData | null };
  }

  const digitalConfig = getDigitalServiceConfig(digitalServiceId);
  if (!digitalConfig) {
    return { order, digitalServiceId: null, vendedData: null as DigitalVendedData | null };
  }

  const paymentMeta = order.paymentMeta ?? {};
  const accountReference = typeof paymentMeta.accountNumber === "string"
    ? paymentMeta.accountNumber
    : order.items?.[0]?.id?.split(`${digitalServiceId}-`)[1] ?? "unknown";

  if (SUCCESSFUL_GATEWAY_STATUSES.has(status)) {
    const alreadyCompleted = Boolean(paymentMeta.receiptNumber || paymentMeta.token);
    if (alreadyCompleted) {
      const vendedData = {
        token: typeof paymentMeta.token === "string" ? paymentMeta.token : undefined,
        units: typeof paymentMeta.units === "number" ? paymentMeta.units : undefined,
        receiptNumber: typeof paymentMeta.receiptNumber === "string" ? paymentMeta.receiptNumber : undefined,
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
        token: vendedData.token,
        receiptNumber: vendedData.receiptNumber,
        completedAt: typeof paymentMeta.vendedAt === "string" ? paymentMeta.vendedAt : new Date().toISOString(),
      });

      return { order: await getOrder(orderReference), digitalServiceId, vendedData };
    }

    const serviceType = digitalServiceId.toUpperCase() as Uppercase<DigitalServiceId>;
    const serviceMeta = extractServiceMeta(order);

    try {
      const vendResult = await DigitalService.vendDigitalFulfilment(serviceType, {
        orderReference,
        accountNumber: accountReference,
        amountUsd: order.totalUsd || order.total,
        serviceMeta: {
          ...(serviceMeta ?? {}),
          customerName: order.customerName,
          customerMobile: order.customerPhone ?? "",
          currencyCode: order.currencyCode ?? "840",
        },
      });

      if (!vendResult.success) {
        throw new Error(vendResult.message || `${digitalConfig.label} fulfilment failed.`);
      }

      const vendedData = {
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

      return { order: await getOrder(orderReference), digitalServiceId, vendedData };
    } catch (vendError) {
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

      return { order: await getOrder(orderReference), digitalServiceId, vendedData: null as DigitalVendedData | null };
    }
  }

  if (FAILED_GATEWAY_STATUSES.has(status)) {
    await upsertDigitalOrder({
      orderReference,
      serviceId: digitalServiceId,
      provider: digitalConfig.provider,
      accountReference,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      provisioningStatus: "failed",
      resultPayload: {
        status,
      },
    });
  }

  return { order: await getOrder(orderReference), digitalServiceId, vendedData: null as DigitalVendedData | null };
}
