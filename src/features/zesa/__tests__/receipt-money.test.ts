import { describe, expect, it } from "vitest";

import {
  formatZetdcMajorMoney,
  formatZetdcReceiptMoney,
  getZetdcTariffRate,
  zetdcReceiptMinorToMajor,
} from "../lib/receipt-money";

describe("ZETDC receipt money formatting", () => {
  it("renders EGRESS cents as readable USD values", () => {
    expect(zetdcReceiptMinorToMajor(500)).toBe(5);
    expect(formatZetdcReceiptMoney(500, "840")).toBe("$5.00 USD");
    expect(formatZetdcReceiptMoney(943395, "840")).toBe("$9433.95 USD");
    expect(formatZetdcReceiptMoney(56604, "840")).toBe("$566.04 USD");
  });

  it("renders EGRESS cents as readable ZiG values", () => {
    expect(formatZetdcReceiptMoney(943395, "924")).toBe("ZiG 9433.95");
  });

  it("renders already-major payment fallback values readably", () => {
    expect(formatZetdcMajorMoney(5, "840")).toBe("$5.00 USD");
    expect(formatZetdcMajorMoney(5, "924")).toBe("ZiG 5.00");
  });

  it("calculates tariff rate from readable major units", () => {
    expect(getZetdcTariffRate({ units: 171.3, receiptAmountMinor: 943395 })).toBe(55.07);
  });
});
