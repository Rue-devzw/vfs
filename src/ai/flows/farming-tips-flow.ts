'use server';

/**
 * @fileOverview Generates farming tips based on a user-provided topic.
 *
 * - generateFarmingTip - A function that generates a farming tip.
 * - GenerateFarmingTipInput - The input type for the generateFarmingTip function.
 * - GenerateFarmingTipOutput - The return type for the generateFarmingTip function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFarmingTipInputSchema = z.object({
  topic: z.string().describe('The farming-related topic to generate a tip for.'),
});
export type GenerateFarmingTipInput = z.infer<typeof GenerateFarmingTipInputSchema>;

const GenerateFarmingTipOutputSchema = z.object({
  tip: z.string().describe('A helpful and actionable tip related to the provided topic.'),
});
export type GenerateFarmingTipOutput = z.infer<typeof GenerateFarmingTipOutputSchema>;

export async function generateFarmingTip(input: GenerateFarmingTipInput): Promise<GenerateFarmingTipOutput> {
  return generateFarmingTipFlow(input);
}

const prompt = ai.definePrompt({
  name: 'farmingTipPrompt',
  input: {schema: GenerateFarmingTipInputSchema},
  output: {schema: GenerateFarmingTipOutputSchema},
  prompt: `You are an expert agricultural advisor for Southern Africa.

  Based on the user's topic, provide a clear, concise, and actionable tip related to it.

  Topic: {{{topic}}}`,
});

const generateFarmingTipFlow = ai.defineFlow(
  {
    name: 'generateFarmingTipFlow',
    inputSchema: GenerateFarmingTipInputSchema,
    outputSchema: GenerateFarmingTipOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
