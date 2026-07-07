const DEFAULT_BASE_URL = "https://zbnet.zb.co.zw";
const TOKEN_TTL_MS = 50 * 60 * 1000;
const RATE_TTL_MS = 5 * 60 * 1000;

type CachedValue<T> = { value: T; expiresAt: number };

let tokenCache: CachedValue<string> | undefined;
const rateCache = new Map<string, CachedValue<number>>();

function config() {
  const username = process.env.ZB_EXCHANGE_RATE_USERNAME?.trim();
  const password = process.env.ZB_EXCHANGE_RATE_PASSWORD?.trim();
  if (!username || !password) {
    throw new Error("ZB exchange-rate credentials are not configured.");
  }
  return {
    baseUrl: (process.env.ZB_EXCHANGE_RATE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    username,
    password,
  };
}

function tokenFrom(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  for (const key of ["token", "accessToken", "access_token", "jwt"]) {
    if (typeof record[key] === "string" && record[key]) return record[key];
  }
  for (const key of ["data", "result"]) {
    const nested = tokenFrom(record[key]);
    if (nested) return nested;
  }
  return undefined;
}

async function responseJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return text;
  }
}

async function login(force = false) {
  if (!force && tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.value;
  const { baseUrl, username, password } = config();
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await responseJson(response);
  if (!response.ok) throw new Error(`ZB exchange-rate login failed (${response.status}).`);
  const token = tokenFrom(payload);
  if (!token) throw new Error("ZB exchange-rate login response did not contain a token.");
  tokenCache = { value: token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}

async function requestRate(from: string, to: string, retry = true): Promise<number> {
  const { baseUrl } = config();
  const token = await login();
  const url = new URL(`${baseUrl}/api/exchangerate`);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401 && retry) {
    tokenCache = undefined;
    await login(true);
    return requestRate(from, to, false);
  }
  const payload = await responseJson(response);
  if (!response.ok) throw new Error(`ZB exchange-rate request failed (${response.status}).`);
  const first = payload && typeof payload === "object"
    ? (payload as { exchangeRates?: unknown[] }).exchangeRates?.[0]
    : undefined;
  if (!first || typeof first !== "object") throw new Error("ZB exchange-rate response contained no rates.");
  const row = first as Record<string, unknown>;
  const rawRate = Number(row.exchangeRate);
  if (!Number.isFinite(rawRate) || rawRate <= 0) throw new Error("ZB exchange-rate response contained an invalid rate.");
  return String(row.multiplyDivideFlag).toUpperCase() === "D" ? 1 / rawRate : rawRate;
}

export async function getExchangeRate(from = "USD", to = "ZWG") {
  const normalizedFrom = from.trim().toUpperCase();
  const normalizedTo = to.trim().toUpperCase();
  if (normalizedFrom === normalizedTo) return 1;
  const key = `${normalizedFrom}:${normalizedTo}`;
  const cached = rateCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const rate = await requestRate(normalizedFrom, normalizedTo);
  rateCache.set(key, { value: rate, expiresAt: Date.now() + RATE_TTL_MS });
  return rate;
}

export function clearExchangeRateCaches() {
  tokenCache = undefined;
  rateCache.clear();
}
