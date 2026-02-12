export type ChatMessage = {
    id: string;
    role: "assistant" | "user";
    content: string;
};

export type KnowledgeTopic =
    | "general"
    | "greeting"
    | "store"
    | "delivery"
    | "wholesale"
    | "locations"
    | "contact"
    | "hours"
    | "horticulture"
    | "partner"
    | "accounts"
    | "pricing"
    | "quality"
    | "producers"
    | "support";

export type AssistantReply = {
    content: string;
    topic: KnowledgeTopic | null;
};
