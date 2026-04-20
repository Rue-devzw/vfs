import { describe, expect, it } from "vitest";

import { getHeroBackgroundPool } from "@/lib/hero-backgrounds";

describe("getHeroBackgroundPool", () => {
  it("replaces missing hero image urls with known fallbacks", () => {
    const imageUrls = getHeroBackgroundPool().map((image) => image.imageUrl);

    expect(imageUrls).not.toContain("/images/hero-4.webp");
    expect(imageUrls).not.toContain("/images/hero-6.webp");
    expect(imageUrls).toContain("/images/hero-7.webp");
    expect(imageUrls).toContain("/images/hero-8.webp");
  });

  it("does not return duplicate hero image urls after applying fallbacks", () => {
    const imageUrls = getHeroBackgroundPool().map((image) => image.imageUrl);

    expect(new Set(imageUrls).size).toBe(imageUrls.length);
  });
});
