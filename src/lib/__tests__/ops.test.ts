import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firestore/notifications", () => ({
  processQueuedNotifications: vi.fn(),
}));

vi.mock("@/lib/firestore/inventory", () => ({
  releaseExpiredReservations: vi.fn(),
}));

vi.mock("@/lib/firestore/refunds", () => ({
  processQueuedRefundExecutions: vi.fn(),
}));

vi.mock("@/lib/firestore/digital-orders", () => ({
  sweepStaleDigitalOrders: vi.fn(),
}));

vi.mock("@/lib/firestore/audit", () => ({
  createAuditLog: vi.fn(),
}));

describe("operations maintenance", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("runs queue processors and records a system audit summary", async () => {
    const { processQueuedNotifications } = await import("@/lib/firestore/notifications");
    const { releaseExpiredReservations } = await import("@/lib/firestore/inventory");
    const { processQueuedRefundExecutions } = await import("@/lib/firestore/refunds");
    const { sweepStaleDigitalOrders } = await import("@/lib/firestore/digital-orders");
    const { createAuditLog } = await import("@/lib/firestore/audit");
    const { runOperationsMaintenance } = await import("@/lib/ops");

    vi.mocked(processQueuedNotifications).mockResolvedValue({ attempted: 2, sent: 1, failed: 0, skipped: 1 });
    vi.mocked(releaseExpiredReservations).mockResolvedValue({ updated: 3, orderReferences: ["order_1"] });
    vi.mocked(processQueuedRefundExecutions).mockResolvedValue({ attempted: 1, manualReview: 1, completed: 0, failed: 0 });
    vi.mocked(sweepStaleDigitalOrders).mockResolvedValue({ attempted: 4, escalated: 2 });

    const summary = await runOperationsMaintenance();

    expect(summary.notifications.sent).toBe(1);
    expect(summary.reservations.updated).toBe(3);
    expect(summary.refunds.manualReview).toBe(1);
    expect(summary.digital.escalated).toBe(2);
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "ops_maintenance_ran",
      actor: expect.objectContaining({
        role: "system",
        id: "ops:maintenance",
      }),
    }));
  });
});
