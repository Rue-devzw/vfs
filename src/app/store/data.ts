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
  availableForSale: boolean;
  inventoryManaged: boolean;
  stockOnHand: number;
  reservedQuantity: number;
  allowBackorder: boolean;
  inventoryStatus: "in_stock" | "out_of_stock" | "backorder";
};

// Exporting an empty array for backward compatibility.
export const products: Product[] = [];

export async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await fetch('/api/store/products', { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch products');
    const payload = (await response.json()) as { data?: Product[] };
    return payload.data ?? [];
  } catch (error) {
    console.error('Error loading products:', error);
    return [];
  }
}
