import { NextRequest, NextResponse } from "next/server";

import { generateImageCaption } from "@/app/_actions/ai";
import {
  applyRateLimitHeaders,
  checkRateLimit,
  verifyAuthToken,
} from "@/app/api/ai/_utils/security";

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

export async function POST(request: NextRequest) {
  const rateStatus = checkRateLimit(request, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);
  if (rateStatus.limited) {
    const response = NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429 }
    );
    applyRateLimitHeaders(response, RATE_LIMIT_MAX_REQUESTS, rateStatus);
    return response;
  }

  const authResult = verifyAuthToken(request);
  if (!authResult.authorized) {
    const response = authResult.response ??
      NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    applyRateLimitHeaders(response, RATE_LIMIT_MAX_REQUESTS, rateStatus);
    return response;
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const response = NextResponse.json(
      { error: "Content-Type must be application/json." },
      { status: 415 }
    );
    applyRateLimitHeaders(response, RATE_LIMIT_MAX_REQUESTS, rateStatus);
    return response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const response = NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
    applyRateLimitHeaders(response, RATE_LIMIT_MAX_REQUESTS, rateStatus);
    return response;
  }

  const imageUrl = typeof body === "object" && body !== null && typeof (body as { imageUrl?: unknown }).imageUrl === "string"
    ? (body as { imageUrl: string }).imageUrl.trim()
    : "";

  if (!imageUrl) {
    const response = NextResponse.json(
      { error: "The imageUrl field is required." },
      { status: 400 }
    );
    applyRateLimitHeaders(response, RATE_LIMIT_MAX_REQUESTS, rateStatus);
    return response;
  }

  try {
    const result = await generateImageCaption(imageUrl);
    if (result.error || !result.caption) {
      const response = NextResponse.json(
        { error: result.error ?? "Failed to generate image caption." },
        { status: 400 }
      );
      applyRateLimitHeaders(response, RATE_LIMIT_MAX_REQUESTS, rateStatus);
      return response;
    }

    const response = NextResponse.json({ caption: result.caption });
    applyRateLimitHeaders(response, RATE_LIMIT_MAX_REQUESTS, rateStatus);
    return response;
  } catch (error) {
    console.error("/api/ai/image-caption error", error);
    const response = NextResponse.json(
      { error: "Unexpected error while generating image caption." },
      { status: 500 }
    );
    applyRateLimitHeaders(response, RATE_LIMIT_MAX_REQUESTS, rateStatus);
    return response;
  }
}
