import crypto from "crypto";
import { getDb, isFirebaseConfigured } from "./firebase-admin";

type RateLimitInput = {
  namespace: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const fallbackBuckets = new Map<string, { count: number; expiresAt: number }>();

function buildBucketId(input: RateLimitInput, bucketStart: number) {
  return `rl_${crypto
    .createHash("sha256")
    .update(`${input.namespace}:${input.identifier}:${bucketStart}`)
    .digest("hex")}`;
}

function getBucketStart(windowMs: number) {
  const now = Date.now();
  return now - (now % windowMs);
}

async function runFallbackLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const bucketStart = getBucketStart(input.windowMs);
  const key = `${input.namespace}:${input.identifier}:${bucketStart}`;
  const current = fallbackBuckets.get(key);
  const nextCount = (current?.count ?? 0) + 1;
  const expiresAt = bucketStart + input.windowMs;

  fallbackBuckets.set(key, {
    count: nextCount,
    expiresAt,
  });

  return {
    allowed: nextCount <= input.limit,
    remaining: Math.max(input.limit - nextCount, 0),
    retryAfterSeconds: Math.max(Math.ceil((expiresAt - Date.now()) / 1000), 1),
  };
}

export function getRequestIdentity(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export async function enforceRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  if (!isFirebaseConfigured()) {
    return runFallbackLimit(input);
  }

  const db = getDb();
  const bucketStart = getBucketStart(input.windowMs);
  const bucketEnd = bucketStart + input.windowMs;
  const bucketId = buildBucketId(input, bucketStart);
  const bucketRef = db.collection("rate_limits").doc(bucketId);

  return db.runTransaction(async tx => {
    const bucketDoc = await tx.get(bucketRef);
    const existing = bucketDoc.exists
      ? (bucketDoc.data() as { count?: number; expiresAt?: number })
      : null;
    const nextCount = (existing?.count ?? 0) + 1;

    tx.set(
      bucketRef,
      {
        namespace: input.namespace,
        identifier: input.identifier,
        count: nextCount,
        bucketStart,
        expiresAt: bucketEnd,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return {
      allowed: nextCount <= input.limit,
      remaining: Math.max(input.limit - nextCount, 0),
      retryAfterSeconds: Math.max(Math.ceil((bucketEnd - Date.now()) / 1000), 1),
    };
  });
}
