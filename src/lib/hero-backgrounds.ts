import { ImagePlaceholder, getPlaceholderById, PlaceHolderImages } from "./placeholder-images";

const HERO_IMAGE_PREFIX = "hero-";

export function getHeroBackgroundPool(): ImagePlaceholder[] {
  const seenImageUrls = new Set<string>();

  return PlaceHolderImages
    .filter(image => image.id.startsWith(HERO_IMAGE_PREFIX))
    .map(image => getPlaceholderById(image.id) ?? image)
    .filter((image) => {
      if (seenImageUrls.has(image.imageUrl)) {
        return false;
      }

      seenImageUrls.add(image.imageUrl);
      return true;
    });
}
