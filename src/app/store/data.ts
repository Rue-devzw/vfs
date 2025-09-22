export const categories = [
  "Fruit & Veg",
  "Butchery",
  "Grocery & Spices"
] as const;

export type Category = typeof categories[number];

export const subCategories = [
    "None",
    "Baby",
    "Beverages",
    "Cereals",
    "Cleaning Products",
    "Cosmetics",
    "Dairy",
    "Dried",
    "Oils & Sauces",
    "Other Items",
    "Salad Dressing",
    "Seasoning",
    "Snack",
    "Soups",
    "Spices",
    "Spreads",
    "Starch",
    "Stationery",
    "Tea & Breakfast",
    "Toiletries",
    "Canned Foods"
] as const;

export type SubCategory = typeof subCategories[number];

export type Product = {
  id: number;
  name: string;
  price: number;
  oldPrice?: number;
  unit: string;
  category: Category;
  subcategory?: SubCategory;
  image: string;
  onSpecial: boolean;
};

// ⬇️ ADD THIS ENTIRE BLOCK ⬇️
// This array defines the images that your other components need.
export const PlaceHolderImages = [
  { id: "hero-produce", src: "/images/hero-produce.jpg" },
  { id: "gallery-2", src: "/images/gallery-2.jpg" },
  { id: "gallery-4", src: "/images/gallery-4.jpg" },
  { id: "product-apples", src: "/images/product-apples.jpg" },
  { id: "product-carrots", src: "/images/product-carrots.jpg" },
  { id: "product-broccoli", src: "/images/product-broccoli.jpg" },
  { id: "product-steak", src: "/images/product-steak.jpg" },
  { id: "product-sausages", src: "/images/product-sausages.jpg" },
  { id: "product-chicken", src: "/images/product-chicken.jpg" },
  { id: "product-bread", src: "/images/product-bread.jpg" },
  { id: "product-spices", src: "/images/product-spices.jpg" },
  { id: "product-eggs", src: "/images/product-eggs.jpg" },
];
// ⬆️ END OF BLOCK TO ADD ⬆️


export const products: Product[] = [
  {
    id: 1,
    name: "Red Apples",
    price: 1.5,
    unit: "/kg",
    category: "Fruit & Veg",
    image: "product-apples",
    onSpecial: false,
  },
  {
    id: 2,
    name: "Fresh Carrots",
    price: 1.0,
    unit: "/bunch",
    category: "Fruit & Veg",
    image: "product-carrots",
    onSpecial: true,
    oldPrice: 1.25,
  },
  {
    id: 3,
    name: "Broccoli",
    price: 2.0,
    unit: "/head",
    category: "Fruit & Veg",
    image: "product-broccoli",
    onSpecial: false,
  },
  {
    id: 4,
    name: "Prime Rump Steak",
    price: 9.5,
    unit: "/kg",
    category: "Butchery",
    image: "product-steak",
    onSpecial: false,
  },
  {
    id: 5,
    name: "Boerewors Sausages",
    price: 7.0,
    unit: "/kg",
    category: "Butchery",
    image: "product-sausages",
    onSpecial: true,
    oldPrice: 8.5,
  },
  {
    id: 6,
    name: "Chicken Fillets",
    price: 6.5,
    unit: "/kg",
    category: "Butchery",
    image: "product-chicken",
    onSpecial: false,
  },
  {
    id: 7,
    name: "Artisanal Bread Loaf",
    price: 3.0,
    unit: "/loaf",
    category: "Grocery & Spices",
    subcategory: "Starch",
    image: "product-bread",
    onSpecial: false,
  },
  {
    id: 8,
    name: "Mixed Spices",
    price: 2.5,
    unit: "/jar",
    category: "Grocery & Spices",
    subcategory: "Spices",
    image: "product-spices",
    onSpecial: false,
  },
  {
    id: 9,
    name: "Farm Fresh Eggs",
    price: 2.8,
    unit: "/dozen",
    category: "Grocery & Spices",
    subcategory: "Dairy",
    image: "product-eggs",
    onSpecial: true,
    oldPrice: 3.2,
  },
];
