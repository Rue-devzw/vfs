import { NextResponse } from "next/server";
import { verifyCustomerSession } from "@/lib/auth";
import { getCustomerAccountSnapshot } from "@/lib/firestore/customers";

export async function GET() {
  const session = await verifyCustomerSession();
  if (!session?.email) {
    return new NextResponse(null, { status: 204 });
  }

  const snapshot = await getCustomerAccountSnapshot(session.email);
  if (!snapshot) {
    return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, ...snapshot });
}
