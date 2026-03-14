import { NextResponse } from "next/server";
import { z } from "zod";
import { createDeliveryQuote, getActiveDeliveryZones } from "@/lib/firestore/shipping";

const quoteSchema = z.object({
  zoneId: z.string().trim().min(1),
  address: z.string().trim().min(3),
  currencyCode: z.enum(["840", "924"]),
});

export async function GET() {
  try {
    const zones = await getActiveDeliveryZones();
    return NextResponse.json({ success: true, data: zones });
  } catch (error) {
    console.error("Failed to list delivery zones:", error);
    return NextResponse.json({ success: false, error: "Unable to load delivery zones." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors }, { status: 400 });
    }

    const quote = await createDeliveryQuote(parsed.data);
    return NextResponse.json({ success: true, data: quote });
  } catch (error) {
    console.error("Failed to create delivery quote:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to create delivery quote." },
      { status: 500 },
    );
  }
}
