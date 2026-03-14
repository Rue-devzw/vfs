import { NextResponse } from "next/server";
import { z } from "zod";
import { clearCart, getCart, saveCart } from "@/lib/firestore/carts";

const cartSchema = z.object({
  sessionId: z.string().trim().min(8),
  currencyCode: z.enum(["840", "924"]),
  items: z.array(z.object({
    productId: z.string().trim().min(1),
    quantity: z.number().int().min(1).max(99),
  })),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ success: false, error: "Missing sessionId." }, { status: 400 });
  }

  try {
    const cart = await getCart(sessionId);
    return NextResponse.json({ success: true, cart });
  } catch (error) {
    console.error("Failed to load cart", error);
    return NextResponse.json({ success: false, error: "Unable to load cart." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const validation = cartSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
    }

    const cart = await saveCart(validation.data);
    return NextResponse.json({ success: true, cart });
  } catch (error) {
    console.error("Failed to save cart", error);
    return NextResponse.json({ success: false, error: "Unable to save cart." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ success: false, error: "Missing sessionId." }, { status: 400 });
  }

  try {
    await clearCart(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear cart", error);
    return NextResponse.json({ success: false, error: "Unable to clear cart." }, { status: 500 });
  }
}
