export type DstvPackage = {
  providerProduct: "DstvProduct1" | "DstvProduct2";
  code: string;
  displayName: string;
  currency: "USD";
  amount: number;
};

export const DSTV_PRIMARY_PACKAGES: DstvPackage[] = [
  { providerProduct: "DstvProduct1", code: "LITES20", displayName: "Lite", currency: "USD", amount: 9 },
  { providerProduct: "DstvProduct1", code: "ASIAIS20", displayName: "Indian Standalone Bouquet", currency: "USD", amount: 39 },
  { providerProduct: "DstvProduct1", code: "PRMS20", displayName: "Premium", currency: "USD", amount: 75 },
  { providerProduct: "DstvProduct1", code: "SHOWPRMS20", displayName: "Premium + Showmax", currency: "USD", amount: 75 },
  { providerProduct: "DstvProduct1", code: "PORTS20", displayName: "Portuguese Bouquet", currency: "USD", amount: 45 },
  { providerProduct: "DstvProduct1", code: "COMPS20", displayName: "Compact", currency: "USD", amount: 32 },
  { providerProduct: "DstvProduct1", code: "COFAMS20", displayName: "Family", currency: "USD", amount: 21 },
  { providerProduct: "DstvProduct1", code: "SHOWACSSS2", displayName: "Access + Showmax", currency: "USD", amount: 19.99 },
  { providerProduct: "DstvProduct1", code: "SHOWCOMPS2", displayName: "Compact + Showmax", currency: "USD", amount: 35.99 },
  { providerProduct: "DstvProduct1", code: "COMPLS20", displayName: "Compact + Sports", currency: "USD", amount: 46 },
  { providerProduct: "DstvProduct1", code: "SHOWCOMPLS", displayName: "Compact Plus + Showmax", currency: "USD", amount: 49.99 },
  { providerProduct: "DstvProduct1", code: "SHOWCOFAMS", displayName: "Family + Showmax", currency: "USD", amount: 24.99 },
];

export const DSTV_ADD_ON_PACKAGES: DstvPackage[] = [
  { providerProduct: "DstvProduct2", code: "ASIADS20", displayName: "Indian Add-On Bouquet", currency: "USD", amount: 25 },
  { providerProduct: "DstvProduct2", code: "ACSSS20", displayName: "Access", currency: "USD", amount: 15 },
  { providerProduct: "DstvProduct2", code: "HDPVRS20", displayName: "HDPVR Access", currency: "USD", amount: 14 },
  { providerProduct: "DstvProduct2", code: "ADD2SEC", displayName: "XtraView", currency: "USD", amount: 14 },
  { providerProduct: "DstvProduct2", code: "None", displayName: "No Add-On", currency: "USD", amount: 0 },
];

export function getDstvPrimaryPackage(code: string | undefined) {
  return DSTV_PRIMARY_PACKAGES.find((item) => item.code === code);
}

export function getDstvAddOnPackage(code: string | undefined) {
  return DSTV_ADD_ON_PACKAGES.find((item) => item.code === code);
}

export function calculateDstvBouquetAmountUsd(serviceMeta: Record<string, string> | undefined) {
  const paymentType = serviceMeta?.paymentType?.trim().toUpperCase();
  if (paymentType !== "BOUQUET") {
    return null;
  }

  const primaryPackage = getDstvPrimaryPackage(serviceMeta?.bouquet?.trim());
  const addOnPackage = getDstvAddOnPackage(serviceMeta?.addon?.trim() || serviceMeta?.addons?.trim() || "None");
  const months = Number(serviceMeta?.months);

  if (!primaryPackage || !addOnPackage || !Number.isInteger(months) || months < 1) {
    return null;
  }

  return Number(((primaryPackage.amount + addOnPackage.amount) * months).toFixed(2));
}
