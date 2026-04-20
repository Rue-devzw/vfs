import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runOperationsMaintenance } from "@/lib/ops";

function isAuthorized(request: NextRequest) {
  if (!env.OPS_CRON_SECRET) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  const provided = bearer?.startsWith("Bearer ") ? bearer.slice("Bearer ".length) : request.headers.get("x-ops-secret");
  return provided === env.OPS_CRON_SECRET;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await runOperationsMaintenance();
  return NextResponse.json(summary);
}
