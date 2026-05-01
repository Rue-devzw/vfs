import { describe, expect, it } from "vitest";
import {
  extractZetdcAccountCurrency,
  getAllowedZetdcPaymentCurrencies,
  getZetdcCurrencyRestrictionMessage,
  isAllowedZetdcPaymentCurrency,
} from "@/lib/digital-currency-rules";

describe("ZETDC currency rules", () => {
  it("allows only USD payments for USD accounts", () => {
    expect(getAllowedZetdcPaymentCurrencies("USD")).toEqual(["840"]);
    expect(isAllowedZetdcPaymentCurrency("USD", "840")).toBe(true);
    expect(isAllowedZetdcPaymentCurrency("USD", "924")).toBe(false);
    expect(getZetdcCurrencyRestrictionMessage("USD")).toBe("This ZETDC USD account only accepts USD payments.");
  });

  it("allows both USD and ZiG payments for ZiG accounts", () => {
    expect(getAllowedZetdcPaymentCurrencies("ZiG")).toEqual(["840", "924"]);
    expect(getAllowedZetdcPaymentCurrencies("ZWG")).toEqual(["840", "924"]);
    expect(isAllowedZetdcPaymentCurrency("ZiG", "840")).toBe(true);
    expect(isAllowedZetdcPaymentCurrency("ZiG", "924")).toBe(true);
    expect(getZetdcCurrencyRestrictionMessage("ZWG")).toBe("This ZETDC ZiG account accepts both USD and ZiG payments.");
  });

  it("extracts the account currency from the provider validation snapshot", () => {
    expect(extractZetdcAccountCurrency({
      parsed: {
        currency: "USD",
      },
    })).toBe("USD");
    expect(extractZetdcAccountCurrency({
      parsed: {
        currency: "ZiG",
      },
    })).toBe("ZiG");
  });

  it("extracts the account currency from raw EGRESS response details when parsed currency is missing", () => {
    expect(extractZetdcAccountCurrency({
      responseDetails: "12345678901|Test Customer|Address 1|Address 2|Harare|Province|USD",
    })).toBe("USD");
    expect(extractZetdcAccountCurrency({
      responseDetails: "12345678901|Test Customer|Address 1|Address 2|Harare|Province|ZWG",
    })).toBe("ZWG");
  });
});
