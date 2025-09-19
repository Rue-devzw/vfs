'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {OnsiteAssistantMessage, OnsiteAssistantResponse} from '@/lib/assistant-types';
import {services, locations, contactDetails, horticultureTips} from '@/lib/data';
import {categories, products} from '@/app/store/data';

const PromptInputSchema = z.object({
  knowledgeBase: z
    .string()
    .describe('Structured Valley Farm Secrets reference information that must be used to answer questions.'),
  conversation: z
    .string()
    .describe('Full conversation transcript with speaker labels in chronological order.'),
});

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']).describe('Indicates whether the speaker is the client or the AI assistant.'),
  content: z
    .string()
    .describe('What the speaker said. Use natural language without additional formatting.'),
});

const FlowInputSchema = z.object({
  messages: z
    .array(MessageSchema)
    .min(1, 'Provide at least one message so the assistant knows the current question.')
    .describe('Ordered conversation history between the client and the Valley Farm Secrets assistant.'),
});

const FlowOutputSchema = z.object({
  reply: z
    .string()
    .describe('Friendly, informative reply that relies on the knowledge base whenever possible.'),
  needsEscalation: z
    .boolean()
    .describe('True when the issue must be forwarded to the human support team via WhatsApp and email.'),
  escalationReason: z
    .string()
    .nullable()
    .describe('Short reason explaining why the chat needs human follow-up when escalation is required.'),
});

const knowledgeBase = buildKnowledgeBase();

const prompt = ai.definePrompt({
  name: 'onsiteAssistantPrompt',
  input: {schema: PromptInputSchema},
  output: {schema: FlowOutputSchema},
  prompt: `You are Valley Farm Secrets' onsite virtual assistant. Use the provided knowledge base to give precise, friendly help.

Knowledge base:
{{{knowledgeBase}}}

Conversation:
{{{conversation}}}

Guidelines:
- Always ground answers in the knowledge base. If something is unknown, be transparent about it.
- When you can fully resolve the request with the knowledge base, keep needsEscalation as false.
- Set needsEscalation to true only when the client reports an urgent matter, complex service issue, special request that needs human approval, or anything outside the knowledge base. Explain the reason in escalationReason.
- When escalating, reassure the client that you are forwarding the full conversation to the WhatsApp helpline at +263 788 679 000 / +263 711 406 919 and emailing info@valleyfarmsecrets.com for follow-up.
- Keep replies warm, professional, and under 180 words. Mention relevant services, locations, hours, or contact details where useful.
- If the client asks for direct human contact, escalate.
`,
});

const generateOnsiteAssistantFlow = ai.defineFlow(
  {
    name: 'generateOnsiteAssistantFlow',
    inputSchema: FlowInputSchema,
    outputSchema: FlowOutputSchema,
  },
  async input => {
    const conversation = formatConversation(input.messages);
    const {output} = await prompt({
      knowledgeBase,
      conversation,
    });
    return output!;
  }
);

export async function generateOnsiteAssistantResponse({
  messages,
}: {
  messages: OnsiteAssistantMessage[];
}): Promise<OnsiteAssistantResponse> {
  return generateOnsiteAssistantFlow({messages});
}

function formatConversation(messages: OnsiteAssistantMessage[]): string {
  return messages
    .map(message => `${message.role === 'user' ? 'Client' : 'Assistant'}: ${message.content}`)
    .join('\n');
}

function buildKnowledgeBase(): string {
  const serviceLines = services
    .map(service => `- ${service.title}: ${service.description}`)
    .join('\n');

  const locationLines = locations
    .map(
      location =>
        `- ${location.city} (${location.role}): ${location.address}. Services: ${location.services.join(', ')}`
    )
    .join('\n');

  const contactLines = contactDetails
    .map(detail => `- ${detail.label}: ${detail.value}`)
    .join('\n');

  const horticultureLines = horticultureTips
    .map(tip => `- ${tip.title}: ${tip.description}`)
    .join('\n');

  const storeCategories = categories.join(', ');

  const productLines = products
    .map(product => {
      const price = product.price.toFixed(2);
      const wasPrice = product.onSpecial && product.oldPrice
        ? ` (on special, previously ${product.oldPrice.toFixed(2)})`
        : product.onSpecial
        ? ' (currently on special)'
        : '';
      const subcategory = product.subcategory ? ` • ${product.subcategory}` : '';
      return `- ${product.name} [${product.category}${subcategory}]: ${price}${product.unit}${wasPrice}`;
    })
    .join('\n');

  return [
    'Business Overview: Valley Farm Secrets is a Zimbabwe-based fresh food retailer, butcher, and wholesale partner delivering farm-to-table convenience and sourcing support.',
    `Services:\n${serviceLines}`,
    `Locations:\n${locationLines}`,
    `Contact & Support:\n${contactLines}\n- Producer enquiries: producers@valleyfarmsecrets.com\n- Partnership proposals: partners@valleyfarmsecrets.com`,
    `Operating Hours: ${contactDetails.find(detail => detail.label === 'Hours')?.value ?? 'Mon-Sat 8:00 AM - 7:00 PM, Sun: Closed.'}`,
    `Online Store Categories: ${storeCategories}`,
    `Sample Products:\n${productLines}`,
    'Wholesale & Partnerships: Bulk pricing, customised orders, reliable deliveries, and community impact programmes covering food security, farmer empowerment, youth and women empowerment, health, and sustainability. Opportunities include funding, CSR collaborations, impact investments, and skills support.',
    `Horticulture Knowledge Base:\n${horticultureLines}`,
    "Digital Tools & Forms: Farmers' Forum AI for agronomy tips, image caption generator, producer pre-booking form for harvest scheduling, wholesale enquiry form, and partnership proposal submission portal.",
  ].join('\n\n');
}
