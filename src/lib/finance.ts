import crypto from "crypto";

export function buildFinanceDocumentNumber(prefix: string, kind: "ORD" | "INV", reference: string) {
  const compactPrefix = prefix.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "VFS";
  const digest = crypto.createHash("sha256").update(`${kind}:${reference}`).digest("hex").slice(0, 8).toUpperCase();
  return `${compactPrefix}-${kind}-${digest}`;
}

export function calculateOrderTaxTotals(input: {
  subtotalUsd: number;
  deliveryFeeUsd: number;
  taxRatePercent: number;
  pricesIncludeTax: boolean;
}) {
  const preTaxAmountUsd = Number((input.subtotalUsd + input.deliveryFeeUsd).toFixed(2));
  const taxRate = Math.max(0, input.taxRatePercent) / 100;
  const taxTotalUsd = input.pricesIncludeTax
    ? Number((preTaxAmountUsd - (preTaxAmountUsd / (1 + taxRate || 1))).toFixed(2))
    : Number((preTaxAmountUsd * taxRate).toFixed(2));
  const totalUsd = input.pricesIncludeTax
    ? preTaxAmountUsd
    : Number((preTaxAmountUsd + taxTotalUsd).toFixed(2));

  return {
    preTaxAmountUsd,
    taxTotalUsd,
    totalUsd,
  };
}
