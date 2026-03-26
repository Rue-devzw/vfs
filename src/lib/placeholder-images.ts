import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;

export const DEFAULT_PRODUCT_IMAGE_ID = "product-broccoli";
const GENERIC_IMAGE_PREFIXES = ["hero-", "product-"];
const KNOWN_IMAGE_FALLBACKS: Record<string, string> = {
  "/images/hero-4.webp": "/images/hero-7.webp",
  "/images/hero-6.webp": "/images/hero-8.webp",
  "/images/product-apples.webp": "/images/hero-produce.webp",
  "/images/product-spices.webp": "/images/hero-5.webp",
};

const normalizeParentheses = (value: string): string =>
  value.replace(/\(([^)]+)\)/g, (_, content) => {
    const trimmed = content.trim();

    if (!trimmed) {
      return " ";
    }

    return /^[A-Z0-9\s-]+$/.test(trimmed) ? " " : ` ${trimmed} `;
  });

export const slugifyImageId = (value: string): string =>
  normalizeParentheses(value)
    .normalize("NFKD")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

export const isGenericImageId = (imageId: string): boolean =>
  GENERIC_IMAGE_PREFIXES.some(prefix => imageId.startsWith(prefix));

const placeholderById = new Map(PlaceHolderImages.map(image => [image.id, image] as const));

export const getPlaceholderById = (imageId?: string): ImagePlaceholder | undefined =>
  imageId
    ? (() => {
      const match = placeholderById.get(imageId);
      if (!match) return undefined;
      const fallbackUrl = KNOWN_IMAGE_FALLBACKS[match.imageUrl];
      return fallbackUrl ? { ...match, imageUrl: fallbackUrl } : match;
    })()
    : undefined;

export const findProductImagePlaceholder = (
  imageId: string | undefined,
  productName: string,
): ImagePlaceholder | undefined => {
  const explicit = imageId?.trim();

  if (explicit && (explicit.startsWith('http://') || explicit.startsWith('https://'))) {
    return {
      id: explicit,
      description: productName,
      imageUrl: explicit,
      imageHint: productName,
    };
  }

  if (explicit && !isGenericImageId(explicit)) {
    const match = getPlaceholderById(explicit);
    if (match) {
      return match;
    }
  }

  const slug = slugifyImageId(productName);
  if (slug) {
    const match = getPlaceholderById(slug);
    if (match) {
      return match;
    }
  }

  if (explicit) {
    const match = getPlaceholderById(explicit);
    if (match) {
      return match;
    }
  }

  return getPlaceholderById(DEFAULT_PRODUCT_IMAGE_ID);
};
