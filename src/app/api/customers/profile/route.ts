import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "This endpoint has been retired. Use /account/login and /api/account/profile instead.",
    },
    { status: 410 },
  );
}
