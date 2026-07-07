import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearExchangeRateCaches, getExchangeRate } from "../zb-exchange-rate";

describe("ZB exchange-rate adapter", () => {
  beforeEach(() => {
    process.env.ZB_EXCHANGE_RATE_BASE_URL = "https://zb.example.test";
    process.env.ZB_EXCHANGE_RATE_USERNAME = "rate-user";
    process.env.ZB_EXCHANGE_RATE_PASSWORD = "rate-password";
    clearExchangeRateCaches();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearExchangeRateCaches();
  });

  it("logs in and returns the documented multiplying rate", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "token-1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        exchangeRates: [{ exchangeRate: 15.7649, multiplyDivideFlag: "M" }],
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getExchangeRate("USD", "ZWG")).resolves.toBe(15.7649);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://zb.example.test/api/auth/login");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/exchangerate?from=USD&to=ZWG");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer token-1");
  });

  it("inverts rates marked with the divide flag", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "token-2" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        exchangeRates: [{ exchangeRate: 2, multiplyDivideFlag: "D" }],
      }), { status: 200 })));

    await expect(getExchangeRate("USD", "ZWG")).resolves.toBe(0.5);
  });
});
