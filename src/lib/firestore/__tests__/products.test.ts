import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb, isFirebaseConfigured } from "../../firebase-admin";
import { getProductById, listCategories, listProducts } from "../products";

vi.mock("../../firebase-admin", () => ({
  isFirebaseConfigured: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    FIREBASE_PROJECT_ID: "test-project",
    FIREBASE_CLIENT_EMAIL: "test@example.com",
    FIREBASE_PRIVATE_KEY: "test-key",
    ADMIN_SESSION_PASSWORD: "a-very-long-secret-key-at-least-32-chars",
  },
}));

type MockDoc = {
  id: string;
  data: () => Record<string, unknown>;
  exists?: boolean;
};

function createQuerySnapshot(docs: MockDoc[]) {
  return {
    size: docs.length,
    docs,
    forEach(callback: (doc: MockDoc) => void) {
      docs.forEach(callback);
    },
  };
}

describe("products data layer", () => {
  const firebaseConfiguredMock = vi.mocked(isFirebaseConfigured);
  const getDbMock = vi.mocked(getDb);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws when Firebase is not configured", async () => {
    firebaseConfiguredMock.mockReturnValue(false);

    await expect(listProducts()).rejects.toThrow("Firestore is required for product data");
    await expect(getProductById("product-1")).rejects.toThrow("Firestore is required for product data");
    await expect(listCategories()).rejects.toThrow("Firestore is required for product data");
  });

  it("lists products from Firestore", async () => {
    firebaseConfiguredMock.mockReturnValue(true);

    const snapshot = createQuerySnapshot([
      {
        id: "product-1",
        data: () => ({
          name: "Apple",
          price: 1.2,
          unit: "/kg",
          category: "Fruit & Veg",
          subcategory: "None",
          image: "/images/apple.webp",
          onSpecial: true,
          sku: "APL",
        }),
      },
    ]);

    const query = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      startAfter: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(snapshot),
    };

    const db = {
      collection: vi.fn().mockImplementation((name: string) => {
        if (name === "inventory_items") {
          return {
            get: vi.fn().mockResolvedValue({
              forEach() {
                return undefined;
              },
            }),
          };
        }
        if (name !== "products") throw new Error(`Unexpected collection ${name}`);
        return {
          ...query,
          doc: vi.fn(),
        };
      }),
    };

    getDbMock.mockReturnValue(db as never);

    const result = await listProducts({ category: "Fruit & Veg", limit: 10 });

    expect(result.source).toBe("firestore");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "product-1",
      name: "Apple",
      sku: "APL",
    });
  });

  it("gets a single product by id from Firestore", async () => {
    firebaseConfiguredMock.mockReturnValue(true);

    const db = {
      collection: vi.fn().mockImplementation((name: string) => {
        if (name === "inventory_items") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ exists: false }),
            }),
          };
        }
        if (name !== "products") throw new Error(`Unexpected collection ${name}`);
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              exists: true,
              id: "product-2",
              data: () => ({
                name: "Beef",
                price: 4.5,
                unit: "/kg",
                category: "Butchery",
                image: "/images/beef.webp",
                onSpecial: false,
              }),
            }),
          }),
        };
      }),
    };

    getDbMock.mockReturnValue(db as never);

    const result = await getProductById("product-2");

    expect(result.source).toBe("firestore");
    expect(result.product).toMatchObject({
      id: "product-2",
      name: "Beef",
      category: "Butchery",
    });
  });

  it("aggregates categories from Firestore", async () => {
    firebaseConfiguredMock.mockReturnValue(true);

    const snapshot = createQuerySnapshot([
      {
        id: "product-1",
        data: () => ({
          category: "Fruit & Veg",
          subcategory: "None",
          onSpecial: true,
        }),
      },
      {
        id: "product-2",
        data: () => ({
          category: "Fruit & Veg",
          subcategory: "Salad",
          onSpecial: false,
        }),
      },
      {
        id: "product-3",
        data: () => ({
          category: "Butchery",
          subcategory: "None",
          onSpecial: false,
        }),
      },
    ]);

    const db = {
      collection: vi.fn().mockImplementation((name: string) => {
        if (name !== "products") throw new Error(`Unexpected collection ${name}`);
        return {
          select: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(snapshot),
          }),
        };
      }),
    };

    getDbMock.mockReturnValue(db as never);

    const result = await listCategories();

    expect(result.source).toBe("firestore");
    expect(result.categories).toHaveLength(2);
    expect(result.categories.find(category => category.name === "Fruit & Veg")).toMatchObject({
      productCount: 2,
      onSpecialCount: 1,
    });
  });
});
