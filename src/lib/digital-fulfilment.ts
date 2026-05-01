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
  receiptDetails?: Record<string, unknown>;
  message?: string;
  issue?: boolean;
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
  const gatewayReference = typeof paymentMeta.gatewayReference === "string"
    ? paymentMeta.gatewayReference
    : undefined;

  if (process.env.NODE_ENV !== "production" && digitalServiceId === "zesa") {
      console.info("[DEV ZESA] fulfilment sync start", {
        orderReference,
        gatewayStatus: status,
        orderStatus: order.status,
        paymentMetaGatewayStatus: paymentMeta.lastGatewayStatus,
        gatewayReference,
        accountReference,
        alreadyHasToken: Boolean(paymentMeta.token),
        alreadyHasReceiptNumber: Boolean(paymentMeta.receiptNumber),
      });
  }

  if (SUCCESSFUL_GATEWAY_STATUSES.has(status)) {
    const alreadyCompleted = Boolean(paymentMeta.receiptNumber || paymentMeta.token);
    if (alreadyCompleted) {
      const vendedData = {
        token: typeof paymentMeta.token === "string" ? paymentMeta.token : undefined,
        units: typeof paymentMeta.units === "number" ? paymentMeta.units : undefined,
        receiptNumber: typeof paymentMeta.receiptNumber === "string" ? paymentMeta.receiptNumber : undefined,
        receiptDetails: paymentMeta.receiptDetails && typeof paymentMeta.receiptDetails === "object"
          ? paymentMeta.receiptDetails as Record<string, unknown>
          : undefined,
        message: typeof paymentMeta.narrative === "string" ? paymentMeta.narrative : undefined,
      };

      if (process.env.NODE_ENV !== "production" && digitalServiceId === "zesa") {
        console.info("[DEV ZESA] fulfilment already completed", {
          orderReference,
          vendedData,
        });
      }

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
      await setOrderStatus(orderReference, "DELIVERED", {
        ...order.paymentMeta,
        ...vendedData,
        vendedAt: typeof paymentMeta.vendedAt === "string" ? paymentMeta.vendedAt : new Date().toISOString(),
        accountNumber: accountReference,
        serviceType: digitalServiceId.toUpperCase(),
        providerGatewayStatus: status,
      });

      return { order: await getOrder(orderReference), digitalServiceId, vendedData };
    }

    const recordedVendFailure = typeof paymentMeta.vendFailureMessage === "string"
      ? paymentMeta.vendFailureMessage
      : undefined;
    if (recordedVendFailure) {
      const vendedData = {
        receiptNumber: typeof paymentMeta.receiptNumber === "string" ? paymentMeta.receiptNumber : undefined,
        message: recordedVendFailure,
        issue: true,
      };

      if (process.env.NODE_ENV !== "production" && digitalServiceId === "zesa") {
        console.warn("[DEV ZESA] skipping repeat vend after recorded failure", {
          orderReference,
          recordedVendFailure,
          vendedData,
        });
      }

      await upsertDigitalOrder({
        orderReference,
        serviceId: digitalServiceId,
        provider: digitalConfig.provider,
        accountReference,
        provisioningStatus: "failed",
        redactCustomerData: true,
        resultPayload: {
          status: "FAILED",
          error: recordedVendFailure,
        },
      });

      return { order: await getOrder(orderReference), digitalServiceId, vendedData };
    }

    const serviceType = digitalServiceId.toUpperCase() as Uppercase<DigitalServiceId>;
    const serviceMeta = extractServiceMeta(order);
    const resolvedCustomerName = serviceMeta?.accountName || order.customerName;
    const resolvedCustomerMobile = serviceMeta?.customerMobile || order.customerPhone || "";

    if (digitalConfig.purchaseMode !== "provider") {
      const failureMessage = digitalConfig.supportMessage || `${digitalConfig.label} fulfilment is not available.`;
      const vendedData = {
        message: failureMessage,
        issue: true,
      };

      await setOrderStatus(orderReference, status, {
        ...order.paymentMeta,
        accountNumber: accountReference,
        serviceType,
        vendFailureMessage: failureMessage,
        vendFailedAt: new Date().toISOString(),
      });

      await upsertDigitalOrder({
        orderReference,
        serviceId: digitalServiceId,
        provider: digitalConfig.provider,
        accountReference,
        provisioningStatus: "failed",
        redactCustomerData: true,
        resultPayload: {
          status: "FAILED",
          error: failureMessage,
        },
      });

      return { order: await getOrder(orderReference), digitalServiceId, vendedData };
    }

    try {
      if (process.env.NODE_ENV !== "production" && digitalServiceId === "zesa") {
        console.info("[DEV ZESA] attempting EGRESS vend", {
          orderReference,
          gatewayReference,
          accountReference,
          amountUsd: order.totalUsd || order.total,
          serviceMeta: {
            ...(serviceMeta ?? {}),
            customerName: resolvedCustomerName,
            customerMobile: resolvedCustomerMobile,
            currencyCode: order.currencyCode ?? "840",
          },
        });
      }

      const vendResult = await DigitalService.vendDigitalFulfilment(serviceType, {
        orderReference,
        gatewayReference,
        accountNumber: accountReference,
        amountUsd: order.totalUsd || order.total,
        serviceMeta: {
          ...(serviceMeta ?? {}),
          customerName: resolvedCustomerName,
          customerMobile: resolvedCustomerMobile,
          currencyCode: order.currencyCode ?? "840",
        },
      });

      if (process.env.NODE_ENV !== "production" && digitalServiceId === "zesa") {
        console.info("[DEV ZESA] EGRESS vend result", {
          orderReference,
          success: vendResult.success,
          token: vendResult.token,
          units: vendResult.units,
          receiptNumber: vendResult.receiptNumber,
          message: vendResult.message,
          raw: vendResult.raw,
        });
      }

      if (!vendResult.success) {
        throw new Error(vendResult.message || `${digitalConfig.label} fulfilment failed.`);
      }

      const vendedData = {
        token: vendResult.token,
        units: vendResult.units,
        receiptNumber: vendResult.receiptNumber,
        receiptDetails: vendResult.receiptDetails,
        message: vendResult.message,
      };

      await setOrderStatus(orderReference, "DELIVERED", {
        ...order.paymentMeta,
        ...vendedData,
        vendedAt: new Date().toISOString(),
        accountNumber: accountReference,
        serviceType,
        providerGatewayStatus: status,
        serviceMeta: {
          ...(serviceMeta ?? {}),
          customerName: resolvedCustomerName,
          customerMobile: resolvedCustomerMobile,
        },
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
      if (process.env.NODE_ENV !== "production" && digitalServiceId === "zesa") {
        console.error("[DEV ZESA] EGRESS vend failed", {
          orderReference,
          message: vendError instanceof Error ? vendError.message : "Vend failed",
          stack: vendError instanceof Error ? vendError.stack : undefined,
          responseBody:
            vendError instanceof Error && "responseBody" in vendError
              ? (vendError as { responseBody?: unknown }).responseBody
              : undefined,
        });
      }

      const vendFailureMessage = vendError instanceof Error
        ? `${digitalConfig.label} fulfilment failed after payment confirmation. ${vendError.message}`
        : `${digitalConfig.label} fulfilment failed after payment confirmation.`;

      await setOrderStatus(orderReference, status, {
        ...order.paymentMeta,
        accountNumber: accountReference,
        serviceType,
        vendFailureMessage,
        vendFailedAt: new Date().toISOString(),
      });

      await upsertDigitalOrder({
        orderReference,
        serviceId: digitalServiceId,
        provider: digitalConfig.provider,
        accountReference,
        provisioningStatus: "failed",
        redactCustomerData: true,
        resultPayload: {
          status: "FAILED",
          error: vendError instanceof Error ? vendError.message : "Vend failed",
        },
      });

      return {
        order: await getOrder(orderReference),
        digitalServiceId,
        vendedData: {
          message: vendFailureMessage,
          issue: true,
        },
      };
    }
  }

  if (FAILED_GATEWAY_STATUSES.has(status)) {
    if (process.env.NODE_ENV !== "production" && digitalServiceId === "zesa") {
      console.warn("[DEV ZESA] gateway reached failed terminal state", {
        orderReference,
        gatewayStatus: status,
      });
    }

    await upsertDigitalOrder({
      orderReference,
      serviceId: digitalServiceId,
      provider: digitalConfig.provider,
      accountReference,
      provisioningStatus: "failed",
      redactCustomerData: true,
      resultPayload: {
        status,
      },
    });
  }

  return { order: await getOrder(orderReference), digitalServiceId, vendedData: null as DigitalVendedData | null };
}
