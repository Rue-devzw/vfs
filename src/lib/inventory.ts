export type InventoryItem = {
  code: string;
  description: string;
  cashPrice: number | null;
  onlinePrice: number | null;
  availableInstore?: boolean;
};

export type InventoryCategory = {
  id: string;
  name: string;
  items: InventoryItem[];
};

export type InventoryLookupEntry = InventoryItem & {
  categoryId: string;
  categoryName: string;
};

let cachedInventory: InventoryCategory[] | null = null;
let cachedInventoryByCode: Record<string, InventoryLookupEntry> | null = null;

export async function getInventory(): Promise<InventoryCategory[]> {
  if (cachedInventory) return cachedInventory;

  try {
    const response = await fetch('/data/inventory.json');
    if (!response.ok) throw new Error('Failed to fetch inventory');
    cachedInventory = await response.json();
    return cachedInventory!;
  } catch (error) {
    console.error('Error loading inventory:', error);
    return [];
  }
}

export async function getInventoryByCode(): Promise<Record<string, InventoryLookupEntry>> {
  if (cachedInventoryByCode) return cachedInventoryByCode;

  const inventory = await getInventory();
  const lookup: Record<string, InventoryLookupEntry> = {};

  inventory.forEach(category => {
    category.items.forEach(item => {
      lookup[item.code] = {
        ...item,
        categoryId: category.id,
        categoryName: category.name,
        availableInstore: item.availableInstore ?? item.onlinePrice !== null,
      };
    });
  });

  cachedInventoryByCode = lookup;
  return lookup;
}

// For backward compatibility during transition
// Note: This will be empty initially until getInventoryByCode() is called and awaited
export const inventory: InventoryCategory[] = [];
export const inventoryByCode: Record<string, InventoryLookupEntry> = {};
export const flatInventory: InventoryLookupEntry[] = [];
