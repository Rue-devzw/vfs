import { ImagePlaceholder, PlaceHolderImages } from "./placeholder-images";

const HERO_BACKGROUND_IMAGE_IDS = [
  "hero-1",
  "hero-2",
  "hero-3",
  "hero-4",
  "hero-5",
  "hero-6",
  "hero-7",
  "hero-8",
  "product-steak",
  "product-sausages",
  "product-chicken",
  "product-bread",
  "product-spices",
  "product-eggs",
];

export function getHeroBackgroundPool(): ImagePlaceholder[] {
  return PlaceHolderImages.filter(image => HERO_BACKGROUND_IMAGE_IDS.includes(image.id));
}
