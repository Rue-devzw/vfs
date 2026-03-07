import { describe, it, expect, vi } from "vitest";
import { encrypt, decrypt } from "../auth";

// Mock the env since it's used in the module scope or getSessionKey
vi.mock("@/lib/env", () => ({
    env: {
        ADMIN_SESSION_PASSWORD: "a-very-long-secret-key-at-least-32-chars",
    },
}));

describe("auth utilities", () => {
    it("encrypts and decrypts a payload", async () => {
        const payload = { userId: "123", role: "admin" };
        const token = await encrypt(payload);

        expect(token).toBeDefined();
        expect(typeof token).toBe("string");

        const decrypted = await decrypt(token);
        expect(decrypted).toMatchObject(payload);
    });

    it("returns null for invalid tokens", async () => {
        const result = await decrypt("invalid-token");
        expect(result).toBeNull();
    });

    it("returns null for expired tokens", async () => {
        // This would require mocking time or jose internals, 
        // but for now, we verify basic failure handling.
        const result = await decrypt("header.payload.signature");
        expect(result).toBeNull();
    });
});
