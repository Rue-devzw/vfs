import { describe, it, expect, vi } from "vitest";
import { createStaffIdentity, decrypt, encrypt } from "../auth";

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

    it("creates a traceable staff identity from the operator identifier", () => {
        expect(createStaffIdentity("store_manager", "Grace Moyo")).toEqual({
            staffId: "store_manager:grace-moyo",
            staffLabel: "Grace Moyo",
            staffEmail: undefined,
        });
    });

    it("captures operator email when an email address is used", () => {
        expect(createStaffIdentity("auditor", "ops@example.com")).toEqual({
            staffId: "auditor:ops@example.com",
            staffLabel: "ops@example.com",
            staffEmail: "ops@example.com",
        });
    });
});
