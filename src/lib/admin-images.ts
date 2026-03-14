import { findProductImagePlaceholder } from "@/lib/placeholder-images";

export const ADMIN_PLACEHOLDER_IMAGE = "/images/placeholder.webp";

export function resolveAdminImageSrc(image: string | undefined, productName: string) {
  const explicit = image?.trim();

  if (explicit?.startsWith("/") || explicit?.startsWith("http://") || explicit?.startsWith("https://")) {
    return explicit;
  }

  const match = findProductImagePlaceholder(explicit, productName);
  return match?.imageUrl ?? ADMIN_PLACEHOLDER_IMAGE;
}
