import { describe, expect, it } from "vitest";
import {
  extractCimasAccountCurrency,
  extractNyaradzoAccountCurrency,
  extractZetdcAccountCurrency,
  getAllowedCimasPaymentCurrencies,
  getAllowedNyaradzoPaymentCurrencies,
  getAllowedZetdcPaymentCurrencies,
  getCimasCurrencyRestrictionMessage,
  getNyaradzoCurrencyRestrictionMessage,
  getZetdcCurrencyRestrictionMessage,
  isAllowedCimasPaymentCurrency,
  isAllowedNyaradzoPaymentCurrency,
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

describe("CIMAS currency rules", () => {
  it("allows only USD payments for USD accounts", () => {
    expect(getAllowedCimasPaymentCurrencies("USD")).toEqual(["840"]);
    expect(isAllowedCimasPaymentCurrency("USD", "840")).toBe(true);
    expect(isAllowedCimasPaymentCurrency("USD", "924")).toBe(false);
    expect(getCimasCurrencyRestrictionMessage("USD")).toBe("This CIMAS USD account only accepts USD payments.");
  });

  it("allows both USD and ZiG payments for ZiG accounts", () => {
    expect(getAllowedCimasPaymentCurrencies("ZiG")).toEqual(["840", "924"]);
    expect(getAllowedCimasPaymentCurrencies("ZWG")).toEqual(["840", "924"]);
    expect(isAllowedCimasPaymentCurrency("ZiG", "840")).toBe(true);
    expect(isAllowedCimasPaymentCurrency("ZiG", "924")).toBe(true);
    expect(getCimasCurrencyRestrictionMessage("ZWG")).toBe("This CIMAS ZiG account accepts both USD and ZiG payments.");
  });

  it("extracts the account currency from validation snapshots", () => {
    expect(extractCimasAccountCurrency({
      parsed: {
        currency: "USD",
      },
    })).toBe("USD");
    expect(extractCimasAccountCurrency({
      responseDetails: "11445000-Jane Doe|11445000|M|PRIVATE HOSPITAL CASH PLAN|ZWG|25.00",
    })).toBe("ZWG");
  });
});

describe("Nyaradzo currency rules", () => {
  it("allows only USD payments for USD policies", () => {
    expect(getAllowedNyaradzoPaymentCurrencies("USD")).toEqual(["840"]);
    expect(isAllowedNyaradzoPaymentCurrency("USD", "840")).toBe(true);
    expect(isAllowedNyaradzoPaymentCurrency("USD", "924")).toBe(false);
    expect(getNyaradzoCurrencyRestrictionMessage("USD")).toBe("This Nyaradzo USD policy only accepts USD payments.");
  });

  it("allows both USD and ZiG payments for ZiG policies", () => {
    expect(getAllowedNyaradzoPaymentCurrencies("ZiG")).toEqual(["840", "924"]);
    expect(getAllowedNyaradzoPaymentCurrencies("ZWG")).toEqual(["840", "924"]);
    expect(isAllowedNyaradzoPaymentCurrency("ZiG", "840")).toBe(true);
    expect(isAllowedNyaradzoPaymentCurrency("ZiG", "924")).toBe(true);
    expect(getNyaradzoCurrencyRestrictionMessage("ZWG")).toBe("This Nyaradzo ZiG policy accepts both USD and ZiG payments.");
  });

  it("extracts the policy currency from validation snapshots", () => {
    expect(extractNyaradzoAccountCurrency({
      parsed: {
        currency: "USD",
      },
    })).toBe("USD");
    expect(extractNyaradzoAccountCurrency({
      responseDetails: "Jane Doe|10|10|ZWG|1",
    })).toBe("ZWG");
  });
});
