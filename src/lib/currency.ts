export type CurrencyCode = "840" | "924";

const CURRENCY_META: Record<CurrencyCode, { label: string; symbol: string }> = {
  "840": { label: "USD", symbol: "$" },
  "924": { label: "ZiG", symbol: "ZiG " },
};

export const DEFAULT_CURRENCY_CODE: CurrencyCode = "840";
export const CURRENCY_OPTIONS = [
  { code: "840", label: "USD" },
  { code: "924", label: "ZiG" },
] as const satisfies ReadonlyArray<{ code: CurrencyCode; label: string }>;

export function getCurrencyMeta(code: CurrencyCode) {
  return CURRENCY_META[code];
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return value === "840" || value === "924";
}

export function getZwgPerUsdRate() {
  const raw = process.env.NEXT_PUBLIC_CURRENCY_RATE_ZWG_PER_USD
    ?? process.env.CURRENCY_RATE_ZWG_PER_USD
    ?? "1";
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function convertFromUsd(amountUsd: number, code: CurrencyCode, zwgPerUsd = getZwgPerUsdRate()) {
  if (code === "924") {
    return Number((amountUsd * zwgPerUsd).toFixed(2));
  }
  return Number(amountUsd.toFixed(2));
}

export function convertToUsd(amount: number, code: CurrencyCode, zwgPerUsd = getZwgPerUsdRate()) {
  if (code === "924") {
    return Number((amount / zwgPerUsd).toFixed(2));
  }
  return Number(amount.toFixed(2));
}

export function convertCurrencyAmount(
  amount: number,
  fromCode: CurrencyCode,
  toCode: CurrencyCode,
  zwgPerUsd = getZwgPerUsdRate(),
) {
  if (fromCode === toCode) {
    return Number(amount.toFixed(2));
  }

  const amountUsd = fromCode === "840" ? amount : convertToUsd(amount, fromCode, zwgPerUsd);
  return convertFromUsd(amountUsd, toCode, zwgPerUsd);
}

export function formatMoney(amount: number, code: CurrencyCode) {
  const { label, symbol } = getCurrencyMeta(code);
  return `${symbol}${amount.toFixed(2)} ${label}`;
}
