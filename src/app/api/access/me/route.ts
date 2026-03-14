import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/auth";

export async function GET() {
  const access = await getAccessContext();
  return NextResponse.json({
    success: true,
    access,
  });
}
