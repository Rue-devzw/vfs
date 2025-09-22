import { ImagePlaceholder, PlaceHolderImages } from "./placeholder-images";

const HERO_BACKGROUND_IMAGE_IDS = [
  "hero-produce",
  "gallery-1",
  "gallery-2",
  "gallery-3",
  "gallery-4",
  "product-apples",
  "product-carrots",
  "product-broccoli",
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
