import type { CurrencyCode } from "@/lib/currency";

export function zetdcReceiptMinorToMajor(amount: number) {
  return Number((amount / 100).toFixed(2));
}

export function formatZetdcMajorMoney(amount: number, currencyCode: CurrencyCode) {
  if (currencyCode === "924") {
    return `ZiG ${amount.toFixed(2)}`;
  }

  return `$${amount.toFixed(2)} USD`;
}

export function formatZetdcReceiptMoney(amount: number, currencyCode: CurrencyCode) {
  return formatZetdcMajorMoney(zetdcReceiptMinorToMajor(amount), currencyCode);
}

export function getZetdcTariffRate(input: {
  units?: number;
  receiptAmountMinor?: number;
  fallbackAmountMajor?: number;
}) {
  if (typeof input.units !== "number" || input.units <= 0) {
    return null;
  }

  const amountMajor = typeof input.receiptAmountMinor === "number"
    ? zetdcReceiptMinorToMajor(input.receiptAmountMinor)
    : input.fallbackAmountMajor;

  if (typeof amountMajor !== "number") {
    return null;
  }

  return Number((amountMajor / input.units).toFixed(2));
}
