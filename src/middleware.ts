import { NextRequest, NextResponse } from "next/server";
import {
    decrypt,
    getPermissionForAdminApiPath,
    getPermissionForAdminPath,
    hasStaffPermission,
    isStaffRole,
    type StaffPermission,
} from "@/lib/auth";

const protectedRoutes = ["/admin", "/api/admin", "/account", "/api/account"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (!protectedRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Allow unrestricted access to the login page and its actions
    if (
        pathname === "/admin/login"
        || pathname === "/admin/login/actions"
        || pathname === "/account/login"
        || pathname === "/account/register"
        || pathname === "/account/verify"
        || pathname === "/api/account/login"
        || pathname === "/api/account/register"
        || pathname === "/api/account/logout"
    ) {
        return NextResponse.next();
    }

    const cookieName = pathname.startsWith("/admin") || pathname.startsWith("/api/admin")
        ? "admin_session"
        : "customer_session";
    const loginPath = cookieName === "admin_session" ? "/admin/login" : "/account/login";

    const session = request.cookies.get(cookieName)?.value;
    const verifiedSession = session && await decrypt(session);

    if (!verifiedSession) {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Redirect to login if not authenticated
        return NextResponse.redirect(new URL(loginPath, request.url));
    }

    if (cookieName === "admin_session" && !isStaffRole(verifiedSession.role)) {
        return pathname.startsWith("/api/")
            ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
            : NextResponse.redirect(new URL("/admin/login", request.url));
    }

    if (cookieName === "customer_session" && verifiedSession.role !== "customer") {
        return pathname.startsWith("/api/")
            ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
            : NextResponse.redirect(new URL("/account/login", request.url));
    }

    if (cookieName === "admin_session") {
        const requiredPermission = pathname.startsWith("/api/")
            ? getPermissionForAdminApiPath(pathname)
            : getPermissionForAdminPath(pathname);

        if (!hasStaffPermission({
            permissions: Array.isArray(verifiedSession.permissions)
                ? verifiedSession.permissions.filter((permission): permission is StaffPermission => typeof permission === "string")
                : [],
        }, requiredPermission)) {
            return pathname.startsWith("/api/")
                ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
                : NextResponse.redirect(new URL("/admin", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*", "/account/:path*", "/api/account/:path*"],
};
