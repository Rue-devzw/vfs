import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;

export const DEFAULT_PRODUCT_IMAGE_ID = "product-apples";
const GENERIC_IMAGE_PREFIXES = ["hero-", "product-"];

export const slugifyImageId = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/\(.*?\)/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

export const isGenericImageId = (imageId: string): boolean =>
  GENERIC_IMAGE_PREFIXES.some(prefix => imageId.startsWith(prefix));

const placeholderById = new Map(PlaceHolderImages.map(image => [image.id, image] as const));

export const getPlaceholderById = (imageId?: string): ImagePlaceholder | undefined =>
  imageId ? placeholderById.get(imageId) : undefined;

export const findProductImagePlaceholder = (
  imageId: string | undefined,
  productName: string,
): ImagePlaceholder | undefined => {
  const explicit = imageId?.trim();

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
