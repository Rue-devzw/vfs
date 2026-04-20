"use server";

import { createAdminSession, destroyAdminSession, type StaffRole } from "@/lib/auth";
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
    return loginWithRoleAction("admin", password, "Admin Operator");
}

function getStaffPassword(role: StaffRole) {
    if (role === "admin") return process.env.ADMIN_PASSWORD;
    if (role === "store_manager") return process.env.STORE_MANAGER_PASSWORD;
    return process.env.AUDITOR_PASSWORD;
}

export async function loginWithRoleAction(role: StaffRole, password: string, operatorIdentifier: string) {
    const correctPassword = getStaffPassword(role);

    if (!correctPassword) {
        throw new Error(`${role.toUpperCase()} password is not configured on the server.`);
    }

    if (!operatorIdentifier.trim()) {
        return { success: false, error: "Operator name or email is required." };
    }

    const identifier = `${role}:${await getRequestIdentifier()}`;
    const lockStatus = await checkAdminLoginLock(identifier);
    if (lockStatus.locked) {
        const minutes = Math.ceil((lockStatus.retryAfterMs ?? 0) / (60 * 1000));
        return { success: false, error: `Too many failed attempts. Try again in ${minutes} minute(s).` };
    }

    if (password === correctPassword) {
        await clearAdminLoginAttempts(identifier);
        await createAdminSession({ role, operatorIdentifier });
        return { success: true, role, operatorLabel: operatorIdentifier.trim() };
    }

    await registerFailedAdminLogin(identifier);
    return { success: false, error: "Invalid password." };
}

export async function logoutAction() {
    await destroyAdminSession();
    return { success: true };
}
