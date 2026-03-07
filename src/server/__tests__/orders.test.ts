import { describe, expect, it } from "vitest";
import { mapExternalStatusToInternal } from "@/server/orders";

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
