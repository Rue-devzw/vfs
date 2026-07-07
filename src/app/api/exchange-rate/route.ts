import { NextResponse } from "next/server";
import { getExchangeRate } from "@/lib/zb-exchange-rate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rate = await getExchangeRate("USD", "ZWG");
    return NextResponse.json({ from: "USD", to: "ZWG", rate });
  } catch (error) {
    console.error("Exchange-rate lookup failed:", error);
    return NextResponse.json({ error: "Exchange rate is temporarily unavailable." }, { status: 503 });
  }
}
