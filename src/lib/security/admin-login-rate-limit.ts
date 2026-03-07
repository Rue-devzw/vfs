import crypto from "crypto";
import { getDb, isFirebaseConfigured } from "@/lib/firebase-admin";

type AttemptRecord = {
  count: number;
  firstAttemptAt: number;
  lockUntil?: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const localStore = new Map<string, AttemptRecord>();

function keyForIdentifier(identifier: string) {
  return crypto.createHash("sha256").update(identifier).digest("hex");
}

function now() {
  return Date.now();
}

function evaluate(record: AttemptRecord, at: number) {
  if (record.lockUntil && record.lockUntil > at) {
    return { locked: true, retryAfterMs: record.lockUntil - at };
  }

  if (at - record.firstAttemptAt > WINDOW_MS) {
    return { locked: false, reset: true };
  }

  return { locked: false, reset: false };
}

export async function checkAdminLoginLock(identifier: string) {
  const key = keyForIdentifier(identifier);
  const at = now();

  if (!isFirebaseConfigured()) {
    const record = localStore.get(key);
    if (!record) return { locked: false as const };
    const state = evaluate(record, at);
    if (state.locked) {
      return { locked: true as const, retryAfterMs: state.retryAfterMs };
    }
    if (state.reset) {
      localStore.delete(key);
    }
    return { locked: false as const };
  }

  const db = getDb();
  const ref = db.collection("admin_login_attempts").doc(key);
  const doc = await ref.get();
  if (!doc.exists) return { locked: false as const };

  const record = doc.data() as AttemptRecord;
  const state = evaluate(record, at);
  if (state.locked) {
    return { locked: true as const, retryAfterMs: state.retryAfterMs };
  }
  if (state.reset) {
    await ref.delete();
  }
  return { locked: false as const };
}

export async function registerFailedAdminLogin(identifier: string) {
  const key = keyForIdentifier(identifier);
  const at = now();

  if (!isFirebaseConfigured()) {
    const existing = localStore.get(key);
    if (!existing || at - existing.firstAttemptAt > WINDOW_MS) {
      localStore.set(key, { count: 1, firstAttemptAt: at });
      return;
    }
    const nextCount = existing.count + 1;
    localStore.set(key, {
      ...existing,
      count: nextCount,
      lockUntil: nextCount >= MAX_ATTEMPTS ? at + LOCKOUT_MS : existing.lockUntil,
    });
    return;
  }

  const db = getDb();
  const ref = db.collection("admin_login_attempts").doc(key);
  await db.runTransaction(async tx => {
    const doc = await tx.get(ref);
    const existing = doc.exists ? (doc.data() as AttemptRecord) : null;
    let updated: AttemptRecord;

    if (!existing || at - existing.firstAttemptAt > WINDOW_MS) {
      updated = { count: 1, firstAttemptAt: at };
    } else {
      const count = existing.count + 1;
      updated = {
        ...existing,
        count,
        lockUntil: count >= MAX_ATTEMPTS ? at + LOCKOUT_MS : existing.lockUntil,
      };
    }

    tx.set(ref, updated);
  });
}

export async function clearAdminLoginAttempts(identifier: string) {
  const key = keyForIdentifier(identifier);

  if (!isFirebaseConfigured()) {
    localStore.delete(key);
    return;
  }

  const db = getDb();
  await db.collection("admin_login_attempts").doc(key).delete();
}
