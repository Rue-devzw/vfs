import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getAdminAuth } from "@/lib/firebase-admin";
import { registerCustomerAccount } from "@/lib/firestore/customers";
import { enforceRateLimit, getRequestIdentity } from "@/lib/rate-limit";

const registerSchema = z.object({
  idToken: z.string().min(1),
  name: z.string().trim().min(2),
  phone: z.string().trim().min(7),
});

export async function POST(req: Request) {
  try {
    const rateLimit = await enforceRateLimit({
      namespace: "account-register",
      identifier: getRequestIdentity(req),
      limit: env.RATE_LIMIT_ACCOUNT_REGISTER_PER_MINUTE ?? 5,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many registration attempts. Please wait before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors }, { status: 400 });
    }

    const decoded = await getAdminAuth().verifyIdToken(parsed.data.idToken);
    if (!decoded.email || !decoded.uid) {
      return NextResponse.json({ success: false, error: "Invalid identity token." }, { status: 401 });
    }

    await registerCustomerAccount({
      email: decoded.email,
      authUserId: decoded.uid,
      name: parsed.data.name,
      phone: parsed.data.phone,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer registration failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to register account." },
      { status: 500 },
    );
  }
}
