export const categories = [
  "Fruit & Veg",
  "Butchery",
  "Grocery & Spices"
] as const;

export type Category = typeof categories[number];

export type Product = {
  id: number;
  name: string;
  price: number;
  oldPrice?: number;
  unit: string;
  category: Category;
  image: string;
  onSpecial: boolean;
};

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
    image: "product-bread",
    onSpecial: false,
  },
  {
    id: 8,
    name: "Mixed Spices",
    price: 2.5,
    unit: "/jar",
    category: "Grocery & Spices",
    image: "product-spices",
    onSpecial: false,
  },
  {
    id: 9,
    name: "Farm Fresh Eggs",
    price: 2.8,
    unit: "/dozen",
    category: "Grocery & Spices",
    image: "product-eggs",
    onSpecial: true,
    oldPrice: 3.2,
  },
];
