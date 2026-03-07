"use server";

import { generateImageCaption as generateImageCaptionFlow, GenerateImageCaptionInput } from "@/ai/flows/image-gallery-captioning";
import { generateFarmingTip as generateFarmingTipFlow, GenerateFarmingTipInput } from "@/ai/flows/farming-tips-flow";

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const PRIVATE_IP_PATTERN = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|169\.254\.|::1)/i;

function validateExternalImageUrl(rawUrl: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const parsed = rawUrl.startsWith("/")
        ? new URL(rawUrl, baseUrl)
        : new URL(rawUrl);

    if (!["https:", "http:"].includes(parsed.protocol)) {
        throw new Error("Only HTTP/HTTPS image URLs are allowed.");
    }

    if (PRIVATE_IP_PATTERN.test(parsed.hostname)) {
        throw new Error("Private network image URLs are not allowed.");
    }

    return parsed.toString();
}

async function imageUrlToDataUri(url: string): Promise<string> {
    const controller = new AbortController();
    const absoluteUrl = validateExternalImageUrl(url);
    const response = await fetch(absoluteUrl, { signal: controller.signal });
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
        controller.abort();
        throw new Error(`Unsupported content type: ${contentType || "unknown"}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        controller.abort();
        throw new Error("Unable to read image data");
    }

    const chunks: Buffer[] = [];
    let total = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
            total += value.length;
            if (total > MAX_IMAGE_SIZE) {
                controller.abort();
                throw new Error("Image exceeds 5MB limit");
            }
            chunks.push(Buffer.from(value));
        }
    }

    const imageBuffer = Buffer.concat(chunks);
    const base64 = imageBuffer.toString("base64");
    return `data:${contentType};base64,${base64}`;
}

export async function generateImageCaption(imageUrl: string) {
    try {
        const dataUri = await imageUrlToDataUri(imageUrl);
        const input: GenerateImageCaptionInput = { imageDataUri: dataUri };
        const result = await generateImageCaptionFlow(input);
        return { caption: result.caption, error: null };
    } catch (error) {
        console.error("Error generating image caption:", error);
        const message = error instanceof Error ? error.message : "Failed to generate caption. Please try again.";
        return { caption: null, error: message };
    }
}

export async function generateFarmingTip(topic: string) {
    try {
        const input: GenerateFarmingTipInput = { topic };
        const result = await generateFarmingTipFlow(input);
        return { tip: result.tip, error: null };
    } catch (error) {
        console.error("Error generating farming tip:", error);
        return { tip: null, error: "Failed to generate tip. Please try again." };
    }
}
