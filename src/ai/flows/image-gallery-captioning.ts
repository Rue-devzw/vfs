'use server';
/**
 * @fileOverview AI-powered image caption generator for the Valley Farm Secrets web application.
 *
 * - generateImageCaption - A function that generates a caption for a given image.
 * - GenerateImageCaptionInput - The input type for the generateImageCaption function.
 * - GenerateImageCaptionOutput - The return type for the generateImageCaption function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageCaptionInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      'A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Ensures proper data URI format
    ),
});
export type GenerateImageCaptionInput = z.infer<
  typeof GenerateImageCaptionInputSchema
>;

const GenerateImageCaptionOutputSchema = z.object({
  caption: z.string().describe('A short, creative, and engaging caption for the image.'), // Describes the caption
});
export type GenerateImageCaptionOutput = z.infer<
  typeof GenerateImageCaptionOutputSchema
>;

export async function generateImageCaption(
  input: GenerateImageCaptionInput
): Promise<GenerateImageCaptionOutput> {
  return generateImageCaptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateImageCaptionPrompt',
  input: {schema: GenerateImageCaptionInputSchema},
  output: {schema: GenerateImageCaptionOutputSchema},
  prompt: `You are a marketing copywriter for Valley Farm Secrets. Generate a short, creative, and engaging caption for the following image.

   {{media url=imageDataUri}}`,
});

const generateImageCaptionFlow = ai.defineFlow(
  {
    name: 'generateImageCaptionFlow',
    inputSchema: GenerateImageCaptionInputSchema,
    outputSchema: GenerateImageCaptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
