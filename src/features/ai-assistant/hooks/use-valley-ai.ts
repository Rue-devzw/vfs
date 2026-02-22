
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AssistantReply, ChatMessage, KnowledgeTopic } from "../types";
import {
    accountsKeywords,
    contactKeywords,
    deliveryKeywords,
    escalateKeywords,
    generalKeywords,
    greetingKeywords,
    horticultureKeywords,
    hoursKeywords,
    locationKeywords,
    moreInfoKeywords,
    partnerKeywords,
    pricingKeywords,
    producersKeywords,
    qualityKeywords,
    storeKeywords,
    thanksKeywords,
    wholesaleKeywords,
} from "../data/constants";
import {
    buildAccountsOverview,
    buildContactOverview,
    buildDeliveryOverview,
    buildGeneralOverview,
    buildHorticultureOverview,
    buildHoursOverview,
    buildLocationsOverview,
    buildPartnerOverview,
    buildPricingOverview,
    buildProducersOverview,
    buildQualityOverview,
    buildRetailOverview,
    buildWholesaleOverview,
    createId,
    getFollowUpForTopic,
} from "../data/response-builders";

export function useValleyAI() {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");

    // Initial welcome message
    const welcomeMessage: ChatMessage = {
        id: "intro",
        role: "assistant",
        content:
            "Hi there! I’m Valley AI, your AI assistant. I can help you compare products, plan deliveries, arrange wholesale supply, share horticulture tips, and prepare handovers to our team. How can I support you today?",
    };

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [lastTopic, setLastTopic] = useState<KnowledgeTopic | null>(null);
    const [isResponding, setIsResponding] = useState(false);
    const [resourcesExpanded, setResourcesExpanded] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const endRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const responseTimeoutRef = useRef<number | null>(null);
    const messageCountRef = useRef(0);

    // Initial load from localStorage
    useEffect(() => {
        const savedMessages = localStorage.getItem("valley-ai-messages");
        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                    messageCountRef.current = parsed.length;
                    return;
                }
            } catch (e) {
                console.error("Failed to parse saved messages", e);
            }
        }
        // Fallback to welcome message if no history
        setMessages([welcomeMessage]);
        messageCountRef.current = 1;
    }, []);

    // Save to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem("valley-ai-messages", JSON.stringify(messages));
        }
    }, [messages]);

    useEffect(() => {
        if (!isOpen) return;
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [isOpen, messages]);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (responseTimeoutRef.current !== null) {
                window.clearTimeout(responseTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setResourcesExpanded(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen && messages.length > messageCountRef.current) {
            const latest = messages[messages.length - 1];
            if (latest?.role === "assistant") {
                setHasUnread(true);
            }
        }

        messageCountRef.current = messages.length;
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen && hasUnread) {
            setHasUnread(false);
        }
    }, [isOpen, hasUnread]);

    const toggleAssistant = () => {
        setIsOpen((previous) => !previous);
    };

    const toggleResources = useCallback(() => {
        setResourcesExpanded((previous) => !previous);
    }, []);

    const lastUserQuestion = useMemo(() => {
        const reversed = [...messages].reverse();
        const lastUser = reversed.find((message) => message.role === "user");
        return lastUser?.content ?? "";
    }, [messages]);

    const generateAssistantReply = useCallback(
        (userInput: string): AssistantReply => {
            const normalized = userInput.toLowerCase();
            const sanitized = normalized.replace(/[^a-z0-9\s]/g, " ");
            const includesTerm = (term: string) =>
                sanitized.includes(term.toLowerCase());
            const includesAny = (terms: string[]) =>
                terms.some((term) => includesTerm(term));

            if (includesAny(thanksKeywords)) {
                return {
                    content:
                        "You’re most welcome! I’m ready to keep helping with products, deliveries, farming support, or anything else you need.",
                    topic: null,
                };
            }

            const wantsHuman =
                includesAny(escalateKeywords) &&
                includesAny(["talk", "speak", "connect", "chat", "help", "assist"]);

            if (wantsHuman) {
                return {
                    content:
                        "I’m here to walk you through our store, deliveries, wholesale quotes, and farming resources right away. Tell me what you need and I’ll gather the details. If you still prefer a teammate afterward, use the WhatsApp or email buttons and I’ll summarise our chat for them.",
                    topic: "support",
                };
            }

            const sections: { topic: KnowledgeTopic; content: string }[] = [];
            const addSection = (topic: KnowledgeTopic, content: string) => {
                if (content) {
                    sections.push({ topic, content });
                }
            };

            if (includesAny(storeKeywords)) {
                addSection("store", buildRetailOverview());
            }

            if (includesAny(deliveryKeywords)) {
                addSection("delivery", buildDeliveryOverview());
            }

            if (includesAny(wholesaleKeywords)) {
                addSection("wholesale", buildWholesaleOverview());
            }

            if (includesAny(horticultureKeywords)) {
                addSection("horticulture", buildHorticultureOverview());
            }

            if (includesAny(locationKeywords)) {
                addSection("locations", buildLocationsOverview());
            }

            if (includesAny(hoursKeywords)) {
                addSection("hours", buildHoursOverview());
            }

            if (includesAny(contactKeywords)) {
                addSection("contact", buildContactOverview());
            }

            if (includesAny(pricingKeywords)) {
                addSection("pricing", buildPricingOverview());
            }

            if (includesAny(accountsKeywords)) {
                addSection("accounts", buildAccountsOverview());
            }

            if (includesAny(partnerKeywords)) {
                addSection("partner", buildPartnerOverview());
            }

            if (includesAny(producersKeywords)) {
                addSection("producers", buildProducersOverview());
            }

            if (includesAny(qualityKeywords)) {
                addSection("quality", buildQualityOverview());
            }

            if (includesAny(generalKeywords)) {
                addSection("general", buildGeneralOverview());
            }

            if (sections.length > 0) {
                return {
                    content: sections.map((section) => section.content).join("\n\n"),
                    topic: sections.length === 1 ? sections[0].topic : "general",
                };
            }

            if (includesAny(moreInfoKeywords) && lastTopic) {
                return {
                    content: getFollowUpForTopic(lastTopic),
                    topic: lastTopic,
                };
            }

            if (includesAny(greetingKeywords)) {
                return {
                    content:
                        "Hi! I’m Valley AI. Ask me about Valley Farm Secrets products, deliveries, wholesale supply, farming support, or partnerships and I’ll share everything I know before looping in a teammate.",
                    topic: "greeting",
                };
            }

            return {
                content: [
                    "I’m here to help you get the most from Valley Farm Secrets.",
                    "Try asking about our products, deliveries, wholesale options, horticulture guidance, partnerships, or contact details and I’ll gather the answers before escalating to the team.",
                    "If you let me know what you’re working on, I can also prepare notes for WhatsApp or email so the handover is seamless.",
                ].join("\n\n"),
                topic: "general",
            };
        },
        [lastTopic],
    );

    const sendMessage = useCallback(
        (message: string) => {
            const trimmed = message.trim();
            if (!trimmed) {
                return;
            }

            setMessages((previous) => [
                ...previous,
                { id: createId(), role: "user", content: trimmed },
            ]);
            setInputValue("");
            setIsResponding(true);

            if (responseTimeoutRef.current !== null) {
                window.clearTimeout(responseTimeoutRef.current);
            }

            responseTimeoutRef.current = window.setTimeout(() => {
                setMessages((previous) => {
                    const reply = generateAssistantReply(trimmed);
                    setLastTopic(reply.topic);
                    return [
                        ...previous,
                        {
                            id: createId(),
                            role: "assistant",
                            content: reply.content,
                        },
                    ];
                });
                setIsResponding(false);
            }, 380);
        },
        [generateAssistantReply],
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        sendMessage(inputValue);
    };

    const clearHistory = () => {
        localStorage.removeItem("valley-ai-messages");
        setMessages([welcomeMessage]);
        setLastTopic(null);
    };

    return {
        isOpen,
        inputValue,
        messages,
        isResponding,
        resourcesExpanded,
        hasUnread,
        endRef,
        inputRef,
        toggleAssistant,
        toggleResources,
        sendMessage,
        handleInputChange,
        handleFormSubmit,
        lastUserQuestion,
        clearHistory,
    };
}
