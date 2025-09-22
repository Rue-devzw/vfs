import { NextResponse } from "next/server";
import { listProducts } from "@/lib/firestore/products";

const MAX_LIMIT = 100;

function parseBooleanParam(value: string | null) {
  if (value === null) return undefined;
  if (["true", "1", "yes"].includes(value.toLowerCase())) return true;
  if (["false", "0", "no"].includes(value.toLowerCase())) return false;
  return null;
}

function parseLimit(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const categoryValue = searchParams.get("category");
  const subcategoryValue = searchParams.get("subcategory");
  const category = categoryValue?.trim() ? categoryValue.trim() : undefined;
  const subcategory = subcategoryValue?.trim() ? subcategoryValue.trim() : undefined;

  const onSpecialParam = parseBooleanParam(searchParams.get("onSpecial"));
  if (onSpecialParam === null) {
    return NextResponse.json(
      { error: "Invalid value for onSpecial. Use true or false." },
      { status: 400 },
    );
  }

  const limitParam = parseLimit(searchParams.get("limit"));
  if (limitParam === null) {
    return NextResponse.json(
      { error: "Invalid value for limit. Provide a number." },
      { status: 400 },
    );
  }

  const cursor = searchParams.get("cursor") ?? undefined;

  try {
    const result = await listProducts({
      category,
      subcategory,
      onSpecial: onSpecialParam,
      limit: limitParam,
      cursor,
    });

    return NextResponse.json({
      data: result.items,
      pagination: {
        nextCursor: result.nextCursor,
        limit: limitParam,
      },
      source: result.source,
    });
  } catch (error) {
    console.error("Failed to load products", error);
    return NextResponse.json(
      { error: "Unable to load products" },
      { status: 500 },
    );
  }
}
