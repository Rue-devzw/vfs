import { getDb, isFirebaseConfigured } from "../firebase-admin";

export type InventoryStatus = "in_stock" | "out_of_stock" | "backorder";
export type InventoryReservationStatus = "active" | "consumed" | "released" | "expired";

export type InventoryRecord = {
  sku: string;
  productId?: string;
  description?: string;
  cashPrice?: number | null;
  onlinePrice?: number | null;
  inventoryManaged: boolean;
  availableForSale: boolean;
  stockOnHand: number;
  reservedQuantity: number;
  allowBackorder: boolean;
  updatedAt?: string;
};

export type InventoryReservationRecord = {
  id: string;
  orderReference: string;
  sku: string;
  productId?: string;
  quantity: number;
  status: InventoryReservationStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  releasedReason?: string;
};

const DEFAULT_RESERVATION_WINDOW_MINUTES = 15;

function normaliseInventoryRecord(
  sku: string,
  data: Partial<InventoryRecord>,
): InventoryRecord {
  const stockOnHand = typeof data.stockOnHand === "number" ? data.stockOnHand : 0;
  const reservedQuantity = typeof data.reservedQuantity === "number" ? data.reservedQuantity : 0;
  const allowBackorder = Boolean(data.allowBackorder);
  const availableForSale = typeof data.availableForSale === "boolean"
    ? data.availableForSale
    : Boolean((data.onlinePrice ?? null) !== null || stockOnHand > 0 || allowBackorder);

  return {
    sku,
    productId: data.productId,
    description: data.description,
    cashPrice: typeof data.cashPrice === "number" ? data.cashPrice : data.cashPrice ?? null,
    onlinePrice: typeof data.onlinePrice === "number" ? data.onlinePrice : data.onlinePrice ?? null,
    inventoryManaged: typeof data.inventoryManaged === "boolean" ? data.inventoryManaged : true,
    availableForSale,
    stockOnHand,
    reservedQuantity,
    allowBackorder,
    updatedAt: data.updatedAt,
  };
}

export function getInventoryStatus(record: InventoryRecord): InventoryStatus {
  if (!record.inventoryManaged) {
    return record.availableForSale ? "in_stock" : "out_of_stock";
  }
  const availableQuantity = record.stockOnHand - record.reservedQuantity;
  if (record.availableForSale && availableQuantity > 0) {
    return "in_stock";
  }
  if (record.availableForSale && record.allowBackorder) {
    return "backorder";
  }
  return "out_of_stock";
}

export async function listInventoryRecords(): Promise<Map<string, InventoryRecord>> {
  if (!isFirebaseConfigured()) {
    return new Map();
  }

  const db = getDb();
  const snapshot = await db.collection("inventory_items").get();
  const map = new Map<string, InventoryRecord>();

  snapshot.forEach(doc => {
    map.set(doc.id.toUpperCase(), normaliseInventoryRecord(doc.id.toUpperCase(), doc.data() as Partial<InventoryRecord>));
  });

  return map;
}

export async function getInventoryRecordBySku(sku?: string | null): Promise<InventoryRecord | null> {
  if (!isFirebaseConfigured() || !sku) {
    return null;
  }

  const db = getDb();
  const doc = await db.collection("inventory_items").doc(sku.toUpperCase()).get();
  if (!doc.exists) {
    return null;
  }

  return normaliseInventoryRecord(doc.id.toUpperCase(), doc.data() as Partial<InventoryRecord>);
}

function buildReservationId(orderReference: string, sku: string) {
  return `reservation_${orderReference}_${sku.toUpperCase()}`;
}

function getReservationExpiry(minutes = DEFAULT_RESERVATION_WINDOW_MINUTES) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export async function reserveInventoryForOrder(input: {
  orderReference: string;
  items: Array<{ sku?: string | null; productId?: string; quantity: number }>;
  expiresInMinutes?: number;
}) {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const db = getDb();
  const timestamp = new Date().toISOString();
  const expiresAt = getReservationExpiry(input.expiresInMinutes);
  const items = input.items
    .filter(item => item.sku && Number.isFinite(item.quantity) && item.quantity > 0)
    .map(item => ({
      sku: item.sku!.toUpperCase(),
      productId: item.productId,
      quantity: Math.floor(item.quantity),
    }));

  if (items.length === 0) {
    return [];
  }

  const results = await db.runTransaction(async tx => {
    const reservations: InventoryReservationRecord[] = [];

    for (const item of items) {
      const inventoryRef = db.collection("inventory_items").doc(item.sku);
      const reservationRef = db.collection("inventory_reservations").doc(buildReservationId(input.orderReference, item.sku));

      const [inventoryDoc, reservationDoc] = await Promise.all([tx.get(inventoryRef), tx.get(reservationRef)]);
      if (!inventoryDoc.exists) {
        continue;
      }

      const inventory = normaliseInventoryRecord(item.sku, inventoryDoc.data() as Partial<InventoryRecord>);
      if (!inventory.inventoryManaged) {
        continue;
      }

      if (reservationDoc.exists) {
        const existing = reservationDoc.data() as InventoryReservationRecord;
        if (existing.status === "active") {
          reservations.push({ ...existing, id: reservationDoc.id });
          continue;
        }
      }

      const availableQuantity = inventory.stockOnHand - inventory.reservedQuantity;
      if (!inventory.allowBackorder && availableQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${item.sku}. Only ${Math.max(availableQuantity, 0)} available.`);
      }

      tx.set(inventoryRef, {
        reservedQuantity: inventory.reservedQuantity + item.quantity,
        updatedAt: timestamp,
      }, { merge: true });

      const reservation: InventoryReservationRecord = {
        id: reservationRef.id,
        orderReference: input.orderReference,
        sku: item.sku,
        productId: item.productId,
        quantity: item.quantity,
        status: "active",
        expiresAt,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      tx.set(reservationRef, reservation, { merge: true });
      reservations.push(reservation);
    }

    return reservations;
  });

  return results;
}

async function mutateReservationsForOrder(input: {
  orderReference: string;
  targetStatus: "consumed" | "released" | "expired";
  reason?: string;
}) {
  if (!isFirebaseConfigured()) {
    return { updated: 0 };
  }

  const db = getDb();
  const snapshot = await db
    .collection("inventory_reservations")
    .where("orderReference", "==", input.orderReference)
    .get();

  const activeReservations = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }) as InventoryReservationRecord)
    .filter(record => record.status === "active");

  if (activeReservations.length === 0) {
    return { updated: 0 };
  }

  const timestamp = new Date().toISOString();
  await db.runTransaction(async tx => {
    for (const reservation of activeReservations) {
      const inventoryRef = db.collection("inventory_items").doc(reservation.sku);
      const reservationRef = db.collection("inventory_reservations").doc(reservation.id);
      const inventoryDoc = await tx.get(inventoryRef);
      if (!inventoryDoc.exists) {
        tx.set(reservationRef, {
          status: input.targetStatus,
          releasedReason: input.reason,
          updatedAt: timestamp,
        }, { merge: true });
        continue;
      }

      const inventory = normaliseInventoryRecord(reservation.sku, inventoryDoc.data() as Partial<InventoryRecord>);
      const nextReserved = Math.max(0, inventory.reservedQuantity - reservation.quantity);
      const inventoryPatch: Partial<InventoryRecord> = {
        reservedQuantity: nextReserved,
        updatedAt: timestamp,
      };

      if (input.targetStatus === "consumed") {
        inventoryPatch.stockOnHand = Math.max(0, inventory.stockOnHand - reservation.quantity);
      }

      tx.set(inventoryRef, inventoryPatch, { merge: true });
      tx.set(reservationRef, {
        status: input.targetStatus,
        releasedReason: input.reason,
        updatedAt: timestamp,
      }, { merge: true });
    }
  });

  return { updated: activeReservations.length };
}

export async function consumeInventoryReservations(orderReference: string) {
  return mutateReservationsForOrder({
    orderReference,
    targetStatus: "consumed",
    reason: "payment_confirmed",
  });
}

export async function releaseInventoryReservations(orderReference: string, reason = "released") {
  return mutateReservationsForOrder({
    orderReference,
    targetStatus: "released",
    reason,
  });
}

export async function releaseExpiredReservations(limit = 100) {
  if (!isFirebaseConfigured()) {
    return { updated: 0, orderReferences: [] as string[] };
  }

  const db = getDb();
  const snapshot = await db
    .collection("inventory_reservations")
    .where("status", "==", "active")
    .limit(limit)
    .get();

  const now = Date.now();
  const expiredOrderReferences = Array.from(
    new Set(
      snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as InventoryReservationRecord)
        .filter(record => new Date(record.expiresAt).getTime() <= now)
        .map(record => record.orderReference),
    ),
  );

  let updated = 0;
  for (const orderReference of expiredOrderReferences) {
    const result = await mutateReservationsForOrder({
      orderReference,
      targetStatus: "expired",
      reason: "reservation_expired",
    });
    updated += result.updated;
  }

  return {
    updated,
    orderReferences: expiredOrderReferences,
  };
}
