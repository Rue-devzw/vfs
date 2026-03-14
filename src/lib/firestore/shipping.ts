import { requireStaffRoles } from "../auth";
import { convertFromUsd, CurrencyCode, getZwgPerUsdRate } from "../currency";
import { getDb, isFirebaseConfigured } from "../firebase-admin";

export type DeliveryZone = {
  id: string;
  name: string;
  cities: string[];
  baseFeeUsd: number;
  etaMinHours: number;
  etaMaxHours: number;
  active: boolean;
};

export type DeliveryQuote = {
  id: string;
  zoneId: string;
  zoneName: string;
  address: string;
  feeUsd: number;
  fee: number;
  currencyCode: CurrencyCode;
  etaMinHours: number;
  etaMaxHours: number;
  expiresAt: string;
  createdAt: string;
};

const DEFAULT_ZONES: DeliveryZone[] = [
  { id: "harare-cbd", name: "Harare CBD", cities: ["Harare", "CBD"], baseFeeUsd: 4, etaMinHours: 2, etaMaxHours: 6, active: true },
  { id: "greater-harare", name: "Greater Harare", cities: ["Avondale", "Borrowdale", "Marlborough", "Belvedere", "Msasa", "Highlands", "Greendale", "Chitungwiza", "Ruwa"], baseFeeUsd: 6, etaMinHours: 4, etaMaxHours: 12, active: true },
  { id: "outer-delivery", name: "Outer Delivery", cities: ["Norton", "Chegutu", "Marondera"], baseFeeUsd: 9, etaMinHours: 12, etaMaxHours: 24, active: true },
];

function sanitizeZone(zone: Partial<DeliveryZone>, fallbackId?: string): DeliveryZone | null {
  const id = String(zone.id ?? fallbackId ?? "").trim();
  const name = String(zone.name ?? "").trim();
  if (!id || !name) return null;

  const cities = Array.isArray(zone.cities)
    ? zone.cities.map(city => String(city).trim()).filter(Boolean)
    : [];

  return {
    id,
    name,
    cities,
    baseFeeUsd: Number(zone.baseFeeUsd ?? 0),
    etaMinHours: Number(zone.etaMinHours ?? 0),
    etaMaxHours: Number(zone.etaMaxHours ?? 0),
    active: zone.active !== false,
  };
}

export async function listDeliveryZones(): Promise<DeliveryZone[]> {
  if (!isFirebaseConfigured()) {
    return DEFAULT_ZONES;
  }

  const snapshot = await getDb().collection("delivery_zones").orderBy("name", "asc").get();
  if (snapshot.empty) {
    return DEFAULT_ZONES;
  }

  return snapshot.docs
    .map(doc => sanitizeZone({ id: doc.id, ...(doc.data() as Partial<DeliveryZone>) }))
    .filter((zone): zone is DeliveryZone => zone !== null);
}

export async function getActiveDeliveryZones(): Promise<DeliveryZone[]> {
  const zones = await listDeliveryZones();
  return zones.filter(zone => zone.active);
}

export async function updateDeliveryZones(zones: DeliveryZone[]) {
  await requireStaffRoles(["admin"]);
  if (!isFirebaseConfigured()) throw new Error("Firestore is not configured");

  const db = getDb();
  const batch = db.batch();
  const timestamp = new Date().toISOString();
  const sanitized = zones
    .map(zone => sanitizeZone(zone))
    .filter((zone): zone is DeliveryZone => zone !== null);

  const existing = await db.collection("delivery_zones").get();
  const nextIds = new Set(sanitized.map(zone => zone.id));
  existing.docs.forEach(doc => {
    if (!nextIds.has(doc.id)) {
      batch.delete(doc.ref);
    }
  });

  sanitized.forEach(zone => {
    batch.set(db.collection("delivery_zones").doc(zone.id), {
      ...zone,
      updatedAt: timestamp,
    }, { merge: true });
  });

  await batch.commit();
}

export async function createDeliveryQuote(input: {
  zoneId: string;
  address: string;
  currencyCode: CurrencyCode;
}): Promise<DeliveryQuote> {
  const zones = await getActiveDeliveryZones();
  const zone = zones.find(entry => entry.id === input.zoneId);
  if (!zone) {
    throw new Error("Selected delivery zone is unavailable.");
  }

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 30 * 60 * 1000).toISOString();
  const feeUsd = Number(zone.baseFeeUsd.toFixed(2));
  const fee = convertFromUsd(feeUsd, input.currencyCode, getZwgPerUsdRate());
  const quote: DeliveryQuote = {
    id: `dq_${createdAt.getTime()}_${zone.id}`,
    zoneId: zone.id,
    zoneName: zone.name,
    address: input.address.trim(),
    feeUsd,
    fee,
    currencyCode: input.currencyCode,
    etaMinHours: zone.etaMinHours,
    etaMaxHours: zone.etaMaxHours,
    createdAt: createdAt.toISOString(),
    expiresAt,
  };

  if (isFirebaseConfigured()) {
    await getDb().collection("delivery_quotes").doc(quote.id).set(quote, { merge: true });
  }

  return quote;
}

export async function getDeliveryQuote(id: string): Promise<DeliveryQuote | null> {
  if (!id) return null;
  if (!isFirebaseConfigured()) return null;

  const doc = await getDb().collection("delivery_quotes").doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as DeliveryQuote;
}

export { DEFAULT_ZONES };
