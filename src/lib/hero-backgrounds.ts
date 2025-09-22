import { ImagePlaceholder, PlaceHolderImages } from "./placeholder-images";

const HERO_IMAGE_PREFIX = "hero-";

export function getHeroBackgroundPool(): ImagePlaceholder[] {
  return PlaceHolderImages.filter(image => image.id.startsWith(HERO_IMAGE_PREFIX));
}
