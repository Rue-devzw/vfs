"use server";

import { generateImageCaption as generateImageCaptionFlow, GenerateImageCaptionInput } from "@/ai/flows/image-gallery-captioning";
import { generateFarmingTip as generateFarmingTipFlow, GenerateFarmingTipInput } from "@/ai/flows/farming-tips-flow";

async function imageUrlToDataUri(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const base64 = Buffer.from(imageBuffer).toString('base64');
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
        return { caption: null, error: "Failed to generate caption. Please try again." };
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
