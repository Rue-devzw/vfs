import { NextResponse } from "next/server";
import { listCategories } from "@/lib/firestore/products";

export async function GET() {
  try {
    const result = await listCategories();
    return NextResponse.json({ data: result.categories, source: result.source });
  } catch (error) {
    console.error("Failed to load categories", error);
    return NextResponse.json({ error: "Unable to load categories" }, { status: 500 });
  }
}
