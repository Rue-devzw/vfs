export type CurrencyCode = "840" | "924";

const CURRENCY_META: Record<CurrencyCode, { label: string; symbol: string }> = {
  "840": { label: "USD", symbol: "$" },
  "924": { label: "ZWG", symbol: "ZWG " },
};

export function getCurrencyMeta(code: CurrencyCode) {
  return CURRENCY_META[code];
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

export function formatMoney(amount: number, code: CurrencyCode) {
  const { label, symbol } = getCurrencyMeta(code);
  return `${symbol}${amount.toFixed(2)} ${label}`;
}

