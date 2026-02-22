import { NextResponse } from "next/server";
import { getProductById } from "@/lib/firestore/products";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const productId = decodeURIComponent(id);

  try {
    const result = await getProductById(productId);
    if (!result.product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result.product, source: result.source });
  } catch (error) {
    console.error(`Failed to load product ${productId}`, error);
    return NextResponse.json({ error: "Unable to load product" }, { status: 500 });
  }
}
