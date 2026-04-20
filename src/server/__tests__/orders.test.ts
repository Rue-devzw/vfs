import { describe, expect, it } from "vitest";
import {
  canAdminTransitionOrderStatus,
  formatOrderStatusLabel,
  hasConfirmedPaymentForOrder,
  mapExternalStatusToInternal,
  shouldQueueGenericOrderStatusNotification,
} from "@/server/orders";

describe("mapExternalStatusToInternal", () => {
  it("maps successful statuses to processing", () => {
    expect(mapExternalStatusToInternal("PAID")).toBe("processing");
    expect(mapExternalStatusToInternal("SUCCESS")).toBe("processing");
  });

  it("maps terminal failure statuses to cancelled", () => {
    expect(mapExternalStatusToInternal("FAILED")).toBe("cancelled");
    expect(mapExternalStatusToInternal("EXPIRED")).toBe("cancelled");
  });

  it("maps pending-like statuses to pending", () => {
    expect(mapExternalStatusToInternal("PENDING")).toBe("pending");
    expect(mapExternalStatusToInternal("SENT")).toBe("pending");
  });
});

describe("admin order transition guards", () => {
  it("detects confirmed payment from gateway, order, or payment intent state", () => {
    expect(hasConfirmedPaymentForOrder({ gatewayStatus: "PAID" })).toBe(true);
    expect(hasConfirmedPaymentForOrder({ orderStatus: "processing" })).toBe(true);
    expect(hasConfirmedPaymentForOrder({ paymentIntentStatus: "paid" })).toBe(true);
    expect(hasConfirmedPaymentForOrder({ gatewayStatus: "PENDING", paymentIntentStatus: "submitted" })).toBe(false);
  });

  it("blocks fulfilment transitions before payment confirmation", () => {
    expect(
      canAdminTransitionOrderStatus({
        currentStatus: "pending",
        nextStatus: "processing",
        paymentConfirmed: false,
      }),
    ).toEqual({
      allowed: false,
      reason: "Payment is not confirmed yet. Keep the order pending or cancel it until the payment path finishes.",
    });
  });

  it("prevents reopening cancelled orders from admin", () => {
    expect(
      canAdminTransitionOrderStatus({
        currentStatus: "cancelled",
        nextStatus: "pending",
        paymentConfirmed: false,
      }),
    ).toEqual({
      allowed: false,
      reason: "Cancelled orders cannot be reopened from admin. Create a new order or reconcile the payment record first.",
    });
  });

  it("allows forward fulfilment transitions after payment confirmation", () => {
    expect(
      canAdminTransitionOrderStatus({
        currentStatus: "processing",
        nextStatus: "shipped",
        paymentConfirmed: true,
      }),
    ).toEqual({ allowed: true });
  });
});

describe("order status notifications", () => {
  it("formats customer-facing order status labels", () => {
    expect(formatOrderStatusLabel("processing")).toBe("Processing");
    expect(formatOrderStatusLabel("cancelled")).toBe("Cancelled");
  });

  it("queues a generic order update only when no specialized notification will be sent", () => {
    expect(
      shouldQueueGenericOrderStatusNotification({
        previousStatus: "processing",
        nextStatus: "shipped",
        queuePaymentNotification: false,
        queueFulfilmentNotification: true,
      }),
    ).toBe(false);

    expect(
      shouldQueueGenericOrderStatusNotification({
        previousStatus: "pending",
        nextStatus: "processing",
        queuePaymentNotification: true,
        queueFulfilmentNotification: false,
      }),
    ).toBe(false);

    expect(
      shouldQueueGenericOrderStatusNotification({
        previousStatus: "shipped",
        nextStatus: "delivered",
        queuePaymentNotification: false,
        queueFulfilmentNotification: false,
      }),
    ).toBe(true);
  });
});
