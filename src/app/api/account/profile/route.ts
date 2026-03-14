import { NextResponse } from "next/server";
import { verifyCustomerSession } from "@/lib/auth";
import { getCustomerAccountSnapshot } from "@/lib/firestore/customers";

export async function GET() {
  const session = await verifyCustomerSession();
  if (!session?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await getCustomerAccountSnapshot(session.email);
  if (!snapshot) {
    return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, ...snapshot });
}
