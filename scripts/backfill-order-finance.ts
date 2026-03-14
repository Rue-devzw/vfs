import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

const envPath = process.env.DOTENV_CONFIG_PATH
  ? path.resolve(process.cwd(), process.env.DOTENV_CONFIG_PATH)
  : path.resolve(process.cwd(), ".env.local");

if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}

type OrderRecord = {
  id?: string;
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  subtotalUsd?: number;
  deliveryFeeUsd?: number;
  totalUsd?: number;
  taxTotal?: number;
  taxTotalUsd?: number;
  taxLabel?: string;
  taxRatePercent?: number;
  currencyCode?: string;
  exchangeRate?: number;
  orderNumber?: string;
  invoiceNumber?: string;
};

async function main() {
  const [
    { getDb, isFirebaseConfigured },
    { getStoreSettings },
    { calculateOrderTaxTotals, buildFinanceDocumentNumber },
    { convertFromUsd, getZwgPerUsdRate },
  ] = await Promise.all([
    import("../src/lib/firebase-admin"),
    import("../src/lib/firestore/settings"),
    import("../src/lib/finance"),
    import("../src/lib/currency"),
  ]);

  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Set .env.local before backfilling order finance data.");
  }

  const db = getDb();
  const settings = await getStoreSettings();
  const snapshot = await db.collection("orders").get();
  const exchangeRate = getZwgPerUsdRate();

  let updated = 0;
  let batch = db.batch();
  let batchCount = 0;

  async function commitBatch() {
    if (batchCount === 0) return;
    await batch.commit();
    batch = db.batch();
    batchCount = 0;
  }

  for (const doc of snapshot.docs) {
    const order = { id: doc.id, ...doc.data() } as OrderRecord;
    const currencyCode = order.currencyCode === "924" ? "924" : "840";
    const derivedSubtotalUsd = typeof order.subtotalUsd === "number"
      ? order.subtotalUsd
      : currencyCode === "924" && typeof order.subtotal === "number"
        ? Number((order.subtotal / (order.exchangeRate || exchangeRate)).toFixed(2))
        : Number((order.subtotal ?? 0).toFixed(2));
    const derivedDeliveryFeeUsd = typeof order.deliveryFeeUsd === "number"
      ? order.deliveryFeeUsd
      : currencyCode === "924" && typeof order.deliveryFee === "number"
        ? Number((order.deliveryFee / (order.exchangeRate || exchangeRate)).toFixed(2))
        : Number((order.deliveryFee ?? 0).toFixed(2));

    const { taxTotalUsd, totalUsd } = calculateOrderTaxTotals({
      subtotalUsd: derivedSubtotalUsd,
      deliveryFeeUsd: derivedDeliveryFeeUsd,
      taxRatePercent: typeof order.taxRatePercent === "number" ? order.taxRatePercent : settings.taxRatePercent,
      pricesIncludeTax: settings.pricesIncludeTax,
    });

    const nextTaxTotal = convertFromUsd(taxTotalUsd, currencyCode, order.exchangeRate || exchangeRate);
    const nextTotal = convertFromUsd(totalUsd, currencyCode, order.exchangeRate || exchangeRate);
    const nextOrderNumber = order.orderNumber || buildFinanceDocumentNumber(settings.invoicePrefix, "ORD", doc.id);
    const nextInvoiceNumber = order.invoiceNumber || buildFinanceDocumentNumber(settings.invoicePrefix, "INV", doc.id);

    const needsUpdate =
      !order.orderNumber
      || !order.invoiceNumber
      || typeof order.taxRatePercent !== "number"
      || typeof order.taxTotalUsd !== "number"
      || typeof order.taxTotal !== "number"
      || !order.taxLabel;

    if (!needsUpdate) {
      continue;
    }

    batch.set(doc.ref, {
      orderNumber: nextOrderNumber,
      invoiceNumber: nextInvoiceNumber,
      taxLabel: order.taxLabel || settings.taxLabel,
      taxRatePercent: typeof order.taxRatePercent === "number" ? order.taxRatePercent : settings.taxRatePercent,
      taxTotal: nextTaxTotal,
      taxTotalUsd,
      totalUsd: typeof order.totalUsd === "number" ? order.totalUsd : totalUsd,
      total: typeof order.total === "number" ? order.total : nextTotal,
      exchangeRate: order.exchangeRate || exchangeRate,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    batchCount += 1;
    updated += 1;

    if (batchCount >= 400) {
      await commitBatch();
    }
  }

  await commitBatch();

  console.log(JSON.stringify({
    updatedOrders: updated,
    processedOrders: snapshot.size,
    processedAt: new Date().toISOString(),
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
