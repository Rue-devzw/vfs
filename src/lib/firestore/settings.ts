"use server";

import { requireStaffRoles } from "../auth";
import { getDb, isFirebaseConfigured } from "../firebase-admin";
import { createAuditLog } from "./audit";

export type StoreSettings = {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  supportWhatsapp: string;
  address: string;
  currencyCode: "USD" | "ZWG";
  showOutOfStock: boolean;
  autoArchiveProducts: boolean;
  taxLabel: string;
  taxRatePercent: number;
  pricesIncludeTax: boolean;
  invoicePrefix: string;
};

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Valley Farm Secrets",
  supportEmail: "support@valleyfarmsecrets.com",
  supportPhone: "+263 788 679 000",
  supportWhatsapp: "+263 788 679 000",
  address: "Harare, Zimbabwe",
  currencyCode: "USD",
  showOutOfStock: true,
  autoArchiveProducts: false,
  taxLabel: "VAT",
  taxRatePercent: 15,
  pricesIncludeTax: false,
  invoicePrefix: "VFS",
};

export async function getStoreSettings(): Promise<StoreSettings> {
  if (!isFirebaseConfigured()) {
    return DEFAULT_SETTINGS;
  }

  const doc = await getDb().collection("settings").doc("store").get();
  if (!doc.exists) {
    return DEFAULT_SETTINGS;
  }

  return {
    ...DEFAULT_SETTINGS,
    ...(doc.data() as Partial<StoreSettings>),
  };
}

export async function updateStoreSettings(settings: StoreSettings): Promise<void> {
  await requireStaffRoles(["admin"]);
  if (!isFirebaseConfigured()) throw new Error("Firestore is not configured");

  await getDb().collection("settings").doc("store").set(
    {
      ...settings,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  await createAuditLog({
    action: "settings_updated",
    targetType: "settings",
    targetId: "store",
    detail: "Store settings updated.",
    meta: {
      currencyCode: settings.currencyCode,
      taxLabel: settings.taxLabel,
      taxRatePercent: settings.taxRatePercent,
      invoicePrefix: settings.invoicePrefix,
      showOutOfStock: settings.showOutOfStock,
      autoArchiveProducts: settings.autoArchiveProducts,
    },
  });
}
