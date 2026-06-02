export type DstvPackage = {
  providerProduct: "DstvProduct1" | "DstvProduct2";
  code: string;
  displayName: string;
  currency: "USD";
  amount: number;
};

export const DSTV_PRIMARY_PACKAGES: DstvPackage[] = [
  { providerProduct: "DstvProduct1", code: "COMPLS20", displayName: "DStv Compact Plus Bouquet IS20", currency: "USD", amount: 46 },
  { providerProduct: "DstvProduct1", code: "ASIA1S20", displayName: "DStv Indian Standalone Bouquet IS20", currency: "USD", amount: 39 },
  { providerProduct: "DstvProduct1", code: "ACSSS20", displayName: "DStv Access Bouquet IS20", currency: "USD", amount: 16 },
  { providerProduct: "DstvProduct1", code: "COFAMS20", displayName: "DStv Family Bouquet IS20", currency: "USD", amount: 21 },
  { providerProduct: "DstvProduct1", code: "PRMS20", displayName: "DStv Premium Bouquet IS20", currency: "USD", amount: 75 },
  { providerProduct: "DstvProduct1", code: "PORTS20", displayName: "DStv Portuguese Bouquet IS20", currency: "USD", amount: 39 },
  { providerProduct: "DstvProduct1", code: "COMPS20", displayName: "DStv Compact Bouquet IS20", currency: "USD", amount: 32 },
  { providerProduct: "DstvProduct1", code: "LITES20", displayName: "Dstv Lite Bouquet IS20", currency: "USD", amount: 9 },
  { providerProduct: "DstvProduct1", code: "PREMOTT", displayName: "DStv Premium Streaming Subscription", currency: "USD", amount: 75 },
  { providerProduct: "DstvProduct1", code: "COMPOTT", displayName: "DStv Compact Streaming Subscription", currency: "USD", amount: 32 },
  { providerProduct: "DstvProduct1", code: "COMPLSOTT", displayName: "DStv Compact Plus Streaming Subscription", currency: "USD", amount: 46 },
  { providerProduct: "DstvProduct1", code: "FAMOTT", displayName: "DStv Family Streaming Subscription", currency: "USD", amount: 21 },
  { providerProduct: "DstvProduct1", code: "ACCSSOTT", displayName: "DStv Access Streaming Subscription", currency: "USD", amount: 16 },
];

export const DSTV_ADD_ON_PACKAGES: DstvPackage[] = [
  { providerProduct: "DstvProduct2", code: "ASIADS20", displayName: "DStv Indian Add-on Bouquet IS20", currency: "USD", amount: 25 },
  { providerProduct: "DstvProduct2", code: "HDPVRS20", displayName: "DStv HDPVR Access Service", currency: "USD", amount: 14 },
  { providerProduct: "DstvProduct2", code: "PORTPS20", displayName: "DStv Portuguese Add-on Bouquet IS20", currency: "USD", amount: 25 },
  { providerProduct: "DstvProduct2", code: "DUALS20", displayName: "DStv Dual View Access Service", currency: "USD", amount: 13 },
  { providerProduct: "DstvProduct2", code: "PVRS20", displayName: "DStv PVR Access Service", currency: "USD", amount: 14 },
  { providerProduct: "DstvProduct2", code: "MOVIESS20", displayName: "DStv Movie Bundle Add-on IS20", currency: "USD", amount: 6 },
  { providerProduct: "DstvProduct2", code: "MOVIESCOMPLS20", displayName: "DStv Compact Plus Movie Bundle Add-on IS20", currency: "USD", amount: 6 },
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
