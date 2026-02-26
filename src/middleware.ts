import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/auth";

const protectedRoutes = ["/admin", "/api/admin"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (!protectedRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Allow unrestricted access to the login page and its actions
    if (pathname === "/admin/login" || pathname === "/admin/login/actions") {
        return NextResponse.next();
    }

    const session = request.cookies.get("admin_session")?.value;
    const verifiedSession = session && await decrypt(session);

    if (!verifiedSession) {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Redirect to login if not authenticated
        return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
};
