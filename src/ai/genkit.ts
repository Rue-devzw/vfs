import {genkit} from 'genkit';
import {openAICompatible} from '@genkit-ai/compat-oai';

export const ai = genkit({
  plugins: [
    openAICompatible({
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
    }),
  ],
  model: 'openai/gpt-4o-mini',
});
