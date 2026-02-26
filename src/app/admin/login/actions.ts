"use server";

import { createAdminSession } from "@/lib/auth";

export async function loginAction(password: string) {
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword) {
        throw new Error("ADMIN_PASSWORD environment variable is not set on the server.");
    }

    if (password === correctPassword) {
        await createAdminSession();
        return { success: true };
    }

    return { success: false, error: "Invalid password." };
}
