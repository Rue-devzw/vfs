import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.SESSION_SECRET || "default_local_development_secret_do_not_use";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: Record<string, unknown>) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(key);
}

export async function decrypt(input: string): Promise<Record<string, unknown> | null> {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ["HS256"],
        });
        return payload as Record<string, unknown>;
    } catch (// eslint-disable-next-line @typescript-eslint/no-unused-vars
    error) {
        return null;
    }
}

export async function createAdminSession() {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const session = await encrypt({ role: "admin", expires });

    const cookieStore = await cookies();
    cookieStore.set("admin_session", session, {
        expires,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    });
}

export async function verifyAdminSession() {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session")?.value;

    if (!session) return null;

    return await decrypt(session);
}

export async function destroyAdminSession() {
    const cookieStore = await cookies();
    cookieStore.set("admin_session", "", {
        maxAge: 0,
        path: "/",
    });
}
