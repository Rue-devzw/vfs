import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "POST /api/orders has been retired. Use the checkout payment initiation flow so inventory, payment intents, shipments, and customer records stay in sync.",
      replacement: "/api/payments/initiate",
    },
    { status: 410 },
  );
}
