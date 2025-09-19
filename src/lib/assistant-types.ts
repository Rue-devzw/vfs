export type OnsiteAssistantRole = 'user' | 'assistant';

export type OnsiteAssistantMessage = {
  role: OnsiteAssistantRole;
  content: string;
};

export type OnsiteAssistantResponse = {
  reply: string;
  needsEscalation: boolean;
  escalationReason: string | null;
};
