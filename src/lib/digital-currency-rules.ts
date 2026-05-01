import type { CurrencyCode } from "@/lib/currency";

const ALL_SUPPORTED_CURRENCIES: CurrencyCode[] = ["840", "924"];

function normalizeProviderCurrency(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "USD") {
    return "USD";
  }

  if (normalized === "ZWG" || normalized === "ZIG") {
    return "ZIG";
  }

  return null;
}

function pickProviderCurrencyFromRecord(record: Record<string, unknown>) {
  const candidates = [
    record.currency,
    record.accountCurrency,
    record.Currency,
    record.ACCOUNT_CURRENCY,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }
    if (normalizeProviderCurrency(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function pickProviderCurrencyFromDelimitedDetails(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return value
    .split("|")
    .map(part => part.trim())
    .find(part => Boolean(normalizeProviderCurrency(part)));
}

export function extractZetdcAccountCurrency(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const rawRecord = raw as Record<string, unknown>;
  const parsed = (raw as { parsed?: unknown }).parsed;
  if (parsed && typeof parsed === "object") {
    const parsedCurrency = pickProviderCurrencyFromRecord(parsed as Record<string, unknown>);
    if (parsedCurrency) {
      return parsedCurrency;
    }
  }

  const rawCurrency = pickProviderCurrencyFromRecord(rawRecord);
  if (rawCurrency) {
    return rawCurrency;
  }

  return pickProviderCurrencyFromDelimitedDetails(rawRecord.responseDetails);
}

export function getAllowedZetdcPaymentCurrencies(providerCurrency: string | undefined): CurrencyCode[] {
  switch (normalizeProviderCurrency(providerCurrency)) {
    case "USD":
      return ["840"];
    case "ZIG":
      return ["840", "924"];
    default:
      return ALL_SUPPORTED_CURRENCIES;
  }
}

export function isAllowedZetdcPaymentCurrency(providerCurrency: string | undefined, currencyCode: CurrencyCode) {
  return getAllowedZetdcPaymentCurrencies(providerCurrency).includes(currencyCode);
}

export function getZetdcCurrencyRestrictionMessage(providerCurrency: string | undefined) {
  switch (normalizeProviderCurrency(providerCurrency)) {
    case "USD":
      return "This ZETDC USD account only accepts USD payments.";
    case "ZIG":
      return "This ZETDC ZiG account accepts both USD and ZiG payments.";
    default:
      return undefined;
  }
}
