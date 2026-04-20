import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationRecord } from "@/lib/firestore/notifications";

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: "dummy",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "dummy.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "dummy-project",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "dummy.appspot.com",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:abcdef",
    FIREBASE_PROJECT_ID: "dummy-project",
    FIREBASE_CLIENT_EMAIL: "dummy@example.com",
    FIREBASE_PRIVATE_KEY: "test-key",
    ADMIN_SESSION_PASSWORD: "a".repeat(32),
    ZB_API_KEY: "key",
    ZB_API_SECRET: "secret",
  },
}));

function buildNotification(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: "ntf_1",
    eventKey: "order:1",
    type: "digital_fulfilment_completed",
    audience: "customer",
    customerEmail: "customer@example.com",
    customerName: "Exavior",
    orderReference: "order_123",
    channels: ["email"],
    status: "queued",
    subject: "Your ZESA fulfilment is complete",
    body: "Your payment was confirmed and your tokens are ready.",
    meta: {
      serviceId: "zesa",
      receiptNumber: "POWER123",
      token: "1111222233334444",
    },
    createdAt: "2026-04-17T12:00:00.000Z",
    updatedAt: "2026-04-17T12:00:00.000Z",
    ...overrides,
  };
}

describe("notification email rendering", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders branded HTML with operational sections", async () => {
    const { renderNotificationEmail } = await import("@/lib/firestore/notifications");
    const rendered = await renderNotificationEmail(buildNotification());

    expect(rendered.html).toContain("Valley Farm Operations");
    expect(rendered.html).toContain("Your ZESA fulfilment is complete");
    expect(rendered.html).toContain("POWER123");
    expect(rendered.html).toContain("1111222233334444");
    expect(rendered.text).toContain("Order Reference: order_123");
  });

  it("omits optional sections when no metadata is present", async () => {
    const { renderNotificationEmail } = await import("@/lib/firestore/notifications");
    const rendered = await renderNotificationEmail(buildNotification({ meta: {} }));

    expect(rendered.html).not.toContain("Receipt Number");
    expect(rendered.text).not.toContain("Receipt Number");
  });
});
