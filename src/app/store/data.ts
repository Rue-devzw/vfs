export const categories = [
  "Fruit & Veg",
  "Butchery",
  "Grocery & Spices",
  "Baby",
  "Cleaning Products",
  "Cosmetics",
  "Toiletries",
  "Beverages",
  "Cereals",
  "Dairy",
  "Dried",
  "Oils & Sauces",
  "Other Items",
  "Salad Dressing",
  "Seasoning",
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
  id: string | number;
  name: string;
  price: number;
  oldPrice?: number;
  unit: string;
  category: Category;
  subcategory?: SubCategory;
  image: string;
  onSpecial: boolean;
  sku?: string;
};

// Exporting an empty array for backward compatibility
// Components should use fetchProducts() instead
export const products: Product[] = [];

export async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await fetch('/data/products.json');
    if (!response.ok) throw new Error('Failed to fetch products');
    return await response.json();
  } catch (error) {
    console.error('Error loading products:', error);
    return [];
  }
}