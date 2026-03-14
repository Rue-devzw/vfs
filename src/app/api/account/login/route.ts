import { NextResponse } from "next/server";
import { z } from "zod";
import { createCustomerSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { getAdminAuth } from "@/lib/firebase-admin";
import { activateCustomerAccount, getCustomerProfileByEmail } from "@/lib/firestore/customers";
import { enforceRateLimit, getRequestIdentity } from "@/lib/rate-limit";

const loginSchema = z.object({
  idToken: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const rateLimit = await enforceRateLimit({
      namespace: "account-login",
      identifier: getRequestIdentity(req),
      limit: env.RATE_LIMIT_ACCOUNT_LOGIN_PER_MINUTE ?? 10,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many sign-in attempts. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors }, { status: 400 });
    }

    const decoded = await getAdminAuth().verifyIdToken(parsed.data.idToken);
    if (!decoded.email || !decoded.uid) {
      return NextResponse.json({ success: false, error: "Invalid identity token." }, { status: 401 });
    }

    if (!decoded.email_verified) {
      return NextResponse.json(
        { success: false, error: "Email verification is required before account access." },
        { status: 403 },
      );
    }

    await activateCustomerAccount({
      email: decoded.email,
      authUserId: decoded.uid,
      name: typeof decoded.name === "string" ? decoded.name : null,
    });

    const profile = await getCustomerProfileByEmail(decoded.email);

    await createCustomerSession({
      authUserId: decoded.uid,
      email: decoded.email,
      phone: profile?.phone,
      name: profile?.name ?? (typeof decoded.name === "string" ? decoded.name : decoded.email),
    });

    return NextResponse.json({
      success: true,
      customer: {
        email: decoded.email,
        name: profile?.name ?? decoded.name ?? decoded.email,
      },
    });
  } catch (error) {
    console.error("Customer login failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to sign in." },
      { status: 500 },
    );
  }
}
