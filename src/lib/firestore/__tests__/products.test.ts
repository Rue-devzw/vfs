import { describe, it, expect, vi, beforeEach } from "vitest";
import { listProducts, getProductById, listCategories } from "../products";
import { isFirebaseConfigured } from "../../firebase-admin";
import { getStaticData } from "../../static-data";

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

vi.mock("../../static-data", () => ({
    getStaticData: vi.fn(),
}));

describe("products data layer", () => {
    const mockProducts = [
        { id: "1", name: "Apple", category: "Fruit", onSpecial: true, price: 10, unit: "kg", image: "apple.jpg" },
        { id: "2", name: "Beef", category: "Meat", onSpecial: false, price: 20, unit: "kg", image: "beef.jpg" },
    ];

    beforeEach(() => {
        vi.resetAllMocks();
    });

    const firebaseConfiguredMock = vi.mocked(isFirebaseConfigured);
    const staticDataMock = vi.mocked(getStaticData);

    describe("listProducts (static mode)", () => {
        it("returns filtered products when Firebase is not configured", async () => {
            firebaseConfiguredMock.mockReturnValue(false);
            staticDataMock.mockResolvedValue(mockProducts);

            const result = await listProducts({ category: "Fruit" });

            expect(result.source).toBe("static");
            expect(result.items).toHaveLength(1);
            expect(result.items[0].name).toBe("Apple");
        });

        it("handles no results", async () => {
            firebaseConfiguredMock.mockReturnValue(false);
            staticDataMock.mockResolvedValue(mockProducts);

            const result = await listProducts({ category: "None" });

            expect(result.items).toHaveLength(0);
        });
    });

    describe("getProductById (static mode)", () => {
        it("returns a product by id", async () => {
            firebaseConfiguredMock.mockReturnValue(false);
            staticDataMock.mockResolvedValue(mockProducts);

            const result = await getProductById("1");

            expect(result.product).not.toBeNull();
            expect(result.product?.name).toBe("Apple");
        });

        it("returns null for unknown id", async () => {
            firebaseConfiguredMock.mockReturnValue(false);
            staticDataMock.mockResolvedValue(mockProducts);

            const result = await getProductById("999");

            expect(result.product).toBeNull();
        });
    });

    describe("listCategories (static mode)", () => {
        it("returns category summaries", async () => {
            firebaseConfiguredMock.mockReturnValue(false);
            staticDataMock.mockResolvedValue(mockProducts);

            const result = await listCategories();

            expect(result.categories).toHaveLength(2);
            const fruit = result.categories.find(c => c.name === "Fruit");
            expect(fruit?.productCount).toBe(1);
            expect(fruit?.onSpecialCount).toBe(1);
        });
    });
});
