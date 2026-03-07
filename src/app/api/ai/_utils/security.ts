import { NextRequest, NextResponse } from "next/server";
import { getDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import crypto from "crypto";

const rateLimitStore = new Map<string, { count: number; reset: number }>();

export interface RateLimitStatus {
  limited: boolean;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [ip] = forwardedFor.split(",");
    if (ip) {
      return ip.trim();
    }
  }

  const forwardedHost =
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-vercel-forwarded-for");
  if (forwardedHost) {
    return forwardedHost;
  }

  return "anonymous";
}

export async function checkRateLimit(
  request: NextRequest,
  limit: number,
  windowMs: number,
  scope = "ai"
): Promise<RateLimitStatus> {
  const identifier = getClientIdentifier(request);
  const now = Date.now();
  const key = crypto.createHash("sha256").update(`${scope}:${identifier}`).digest("hex");

  if (isFirebaseConfigured()) {
    const db = getDb();
    const bucket = Math.floor(now / windowMs);
    const reset = (bucket + 1) * windowMs;
    const ref = db.collection("rate_limits").doc(`${key}:${bucket}`);
    let countAfter = 0;

    await db.runTransaction(async tx => {
      const doc = await tx.get(ref);
      const existingCount = doc.exists ? Number((doc.data() as { count?: number }).count ?? 0) : 0;
      countAfter = existingCount + 1;
      tx.set(ref, {
        count: countAfter,
        reset,
        scope,
        key,
      }, { merge: true });
    });

    if (countAfter > limit) {
      const retryAfter = Math.ceil((reset - now) / 1000);
      return { limited: true, remaining: 0, reset, retryAfter: Math.max(retryAfter, 1) };
    }

    return { limited: false, remaining: Math.max(limit - countAfter, 0), reset };
  }

  const existing = rateLimitStore.get(key);
  if (!existing || now > existing.reset) {
    rateLimitStore.set(key, { count: 1, reset: now + windowMs });
    return { limited: false, remaining: Math.max(limit - 1, 0), reset: now + windowMs };
  }

  if (existing.count >= limit) {
    const retryAfter = Math.ceil((existing.reset - now) / 1000);
    return { limited: true, remaining: 0, reset: existing.reset, retryAfter: Math.max(retryAfter, 1) };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  return { limited: false, remaining: Math.max(limit - existing.count, 0), reset: existing.reset };
}

export function applyRateLimitHeaders(
  response: NextResponse,
  limit: number,
  status: RateLimitStatus
) {
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(status.remaining, 0)));
  response.headers.set("X-RateLimit-Reset", String(Math.floor(status.reset / 1000)));
  if (status.retryAfter !== undefined) {
    response.headers.set("Retry-After", String(status.retryAfter));
  }
}

export interface AuthCheckResult {
  authorized: boolean;
  response?: NextResponse;
}

export function verifyAuthToken(request: NextRequest): AuthCheckResult {
  const expectedToken = process.env.AI_API_TOKEN;
  if (!expectedToken) {
    // Token enforcement disabled when not configured.
    return { authorized: true };
  }

  const header = request.headers.get("authorization") || request.headers.get("x-api-key");
  if (!header) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Missing authorization token." }, { status: 401 }),
    };
  }

  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
  if (token !== expectedToken) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Invalid authorization token." }, { status: 403 }),
    };
  }

  return { authorized: true };
}
