import { NextRequest, NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/auth";
import { buildReconciliationExport } from "@/lib/firestore/reconciliation";

export async function GET(request: NextRequest) {
  try {
    await requireStaffPermission("dashboard.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const packParam = request.nextUrl.searchParams.get("pack");
  const pack = packParam === "batches" || packParam === "inventory_movements" ? packParam : "exceptions";
  const csv = await buildReconciliationExport(pack);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="reconciliation-${pack}.csv"`,
    },
  });
}
