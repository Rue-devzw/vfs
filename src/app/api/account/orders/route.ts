import { NextResponse } from "next/server";
import { verifyCustomerSession } from "@/lib/auth";
import { getCustomerAccountSnapshot } from "@/lib/firestore/customers";

export async function GET() {
  const session = await verifyCustomerSession();
  if (!session?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await getCustomerAccountSnapshot(session.email);
  return NextResponse.json({ success: true, data: snapshot?.orders ?? [] });
}
