"use server";

import { createAdminSession, destroyAdminSession } from "@/lib/auth";
import { headers } from "next/headers";
import {
    checkAdminLoginLock,
    clearAdminLoginAttempts,
    registerFailedAdminLogin,
} from "@/lib/security/admin-login-rate-limit";

function getRequestIdentifier() {
    return headers().then(h => {
        const forwardedFor = h.get("x-forwarded-for");
        if (forwardedFor) {
            const [ip] = forwardedFor.split(",");
            if (ip) return ip.trim();
        }
        return h.get("x-real-ip") || h.get("cf-connecting-ip") || "admin-login-anonymous";
    });
}

export async function loginAction(password: string) {
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword) {
        throw new Error("ADMIN_PASSWORD environment variable is not set on the server.");
    }

    const identifier = await getRequestIdentifier();
    const lockStatus = await checkAdminLoginLock(identifier);
    if (lockStatus.locked) {
        const minutes = Math.ceil((lockStatus.retryAfterMs ?? 0) / (60 * 1000));
        return { success: false, error: `Too many failed attempts. Try again in ${minutes} minute(s).` };
    }

    if (password === correctPassword) {
        await clearAdminLoginAttempts(identifier);
        await createAdminSession();
        return { success: true };
    }

    await registerFailedAdminLogin(identifier);
    return { success: false, error: "Invalid password." };
}

export async function logoutAction() {
    await destroyAdminSession();
    return { success: true };
}
