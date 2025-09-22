"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Mail,
  MessageCircle,
  PhoneCall,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  contactDetails,
  horticultureTips,
  locations,
  services,
  whyChooseUsFeatures,
} from "@/lib/data";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type KnowledgeTopic =
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

type AssistantReply = {
  content: string;
  topic: KnowledgeTopic | null;
};

const BIKER_DELIVERY_FEE = 5;

const quickActions = [
  {
    label: "Shop the store",
    description: "Browse produce, butchery, and grocery departments.",
    href: "/store",
  },
  {
    label: "Request a wholesale quote",
    description: "Bulk supply for schools, restaurants, NGOs, and hotels.",
    href: "/#wholesale",
  },
  {
    label: "Explore horticulture guides",
    description: "Soil prep, pest control, and crop rotation resources.",
    href: "/horticulture-tips",
  },
  {
    label: "Partner with Valley Farm Secrets",
    description: "Collaborate on supply, impact, or investment projects.",
    href: "/become-a-partner",
  },
] as const;

const quickPromptOptions = [
  {
    label: "What products can I buy?",
    prompt: "What products can I buy from Valley Farm Secrets?",
  },
  {
    label: "Delivery or collection",
    prompt: "Do you offer delivery or collection options?",
  },
  {
    label: "Wholesale support",
    prompt: "How can my business request wholesale supply?",
  },
  {
    label: "Branches & hours",
    prompt: "Where are your branches and what are the opening hours?",
  },
  {
    label: "Farming tips",
    prompt: "Can you share horticulture tips?",
  },
] as const;

const SUPPORT_EMAIL = "info@valleyfarmsecrets.com";
const SUPPORT_WHATSAPP = "+263788679000";
const PARTNERS_EMAIL = "partners@valleyfarmsecrets.com";
const EMAIL_SUBJECT = encodeURIComponent("Support request from Valley AI assistant");

const storeKeywords = [
  "product",
  "products",
  "store",
  "shop",
  "shopping",
  "inventory",
  "stock",
  "buy",
  "sell",
  "catalog",
  "cart",
  "order",
  "orders",
  "special",
  "specials",
  "deal",
  "deals",
  "grocery",
  "groceries",
  "butchery",
  "butcher",
  "fruit",
  "fruits",
  "vegetable",
  "vegetables",
  "veg",
  "produce",
  "meat",
  "beef",
  "chicken",
  "goat",
  "lamb",
  "sausage",
  "fish",
  "spice",
  "spices",
  "pantry",
  "grocery & spices",
];

const deliveryKeywords = [
  "delivery",
  "deliveries",
  "deliver",
  "shipping",
  "ship",
  "pickup",
  "pick up",
  "collect",
  "collection",
  "drop off",
  "drop-off",
  "biker",
  "courier",
  "logistics",
];

const wholesaleKeywords = [
  "wholesale",
  "bulk",
  "institution",
  "restaurant",
  "hotel",
  "ngo",
  "pre-pack",
  "prepack",
  "standing order",
  "school",
  "cater",
  "catering",
  "quote",
  "tender",
];

const horticultureKeywords = [
  "horticulture",
  "horticultural",
  "farm",
  "farming",
  "grow",
  "soil",
  "pest",
  "crop",
  "rotation",
  "irrigation",
  "watering",
  "post-harvest",
  "animal",
  "livestock",
  "husbandry",
  "garden",
  "agriculture",
];

const locationKeywords = [
  "where",
  "location",
  "located",
  "address",
  "branch",
  "branches",
  "map",
  "directions",
  "gweru",
  "harare",
  "find you",
];

const hoursKeywords = [
  "hours",
  "opening",
  "closing",
  "open",
  "close",
  "time",
  "times",
  "weekend",
  "sunday",
];

const contactKeywords = [
  "contact",
  "call",
  "phone",
  "email",
  "whatsapp",
  "number",
  "support",
  "reach",
  "speak to",
];

const pricingKeywords = [
  "price",
  "prices",
  "pricing",
  "cost",
  "costs",
  "fee",
  "fees",
  "rates",
  "quote",
  "quotations",
  "afford",
  "budget",
];

const accountsKeywords = [
  "account",
  "accounts",
  "billing",
  "invoice",
  "invoices",
  "vat",
  "statement",
  "credit",
  "corporate",
];

const partnerKeywords = [
  "partner",
  "partnership",
  "collaborate",
  "collaboration",
  "invest",
  "investment",
  "grant",
  "csr",
  "proposal",
  "ngo",
  "impact",
];

const producersKeywords = [
  "producer",
  "producers",
  "farmer",
  "farmers",
  "supplier",
  "suppliers",
  "grower",
  "growers",
  "source",
  "sourcing",
  "supply chain",
];

const qualityKeywords = [
  "why choose",
  "why you",
  "why valley",
  "quality",
  "freshness",
  "sustainable",
  "sustainability",
  "trust",
  "advantage",
  "benefit",
  "difference",
  "what makes",
];

const generalKeywords = [
  "valley farm secrets",
  "vfs",
  "what do you do",
  "what are you",
  "who are you",
  "about you",
  "services",
  "offer",
  "help",
  "assist",
];

const greetingKeywords = [
  "hello",
  "hi",
  "hey",
  "good morning",
  "good afternoon",
  "good evening",
  "greetings",
  "howdy",
];

const thanksKeywords = [
  "thank",
  "thanks",
  "appreciate",
  "grateful",
  "cheers",
];

const moreInfoKeywords = [
  "tell me more",
  "more detail",
  "more details",
  "more info",
  "anything else",
  "what else",
  "elaborate",
  "expand",
];

const escalateKeywords = [
  "human",
  "real person",
  "agent",
  "someone",
  "person",
  "representative",
  "escalate",
];

const createId = () => Math.random().toString(36).slice(2, 10);

const formatBulletedList = (items: string[]) =>
  items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `• ${item}`)
    .join("\n");

const buildRetailOverview = () => {
  const retailServices = services
    .filter((service) =>
      ["Fruit & Vegetables", "Butchery", "Grocery & Spices"].includes(
        service.title,
      ),
    )
    .map((service) => `${service.title}: ${service.description}`);

  return [
    "Here’s how to shop with Valley Farm Secrets:",
    formatBulletedList(retailServices),
    "Visit /store to browse categories, search for items, and check weekly specials. Add what you need to the cart and check out when you’re ready.",
    `At checkout you can choose free collection from 75 Main Street, Gweru or biker delivery within the city for $${BIKER_DELIVERY_FEE.toFixed(2)}. If you need something special, let me know and I’ll involve our sourcing team.`,
  ].join("\n\n");
};

const buildStoreFollowUp = () =>
  [
    "Helpful store tips:",
    formatBulletedList([
      "Use the filters on /store to sort by category, price, or specials.",
      "The Flash Deals carousel highlights weekly savings across departments.",
      'Sending a gift from abroad? Tick "This is a gift for someone in Zimbabwe" at checkout and enter the recipient’s details.',
      "You can pay in full now or let our biker collect payment on delivery when that option is available.",
    ]),
    "If you’d like me to check availability or reserve items, share the product names and quantities and I’ll brief the store team.",
  ].join("\n\n");

const buildDeliveryOverview = () => {
  const hoursDetail = contactDetails.find((detail) =>
    detail.label.toLowerCase().includes("hours"),
  );

  return [
    "Delivery & collection options:",
    formatBulletedList([
      `Free in-person collection from 75 Main Street, Gweru${
        hoursDetail ? ` (${hoursDetail.value})` : ""
      }`,
      `Biker delivery within Gweru for $${BIKER_DELIVERY_FEE.toFixed(2)} with pay-now or pay-on-delivery choices.`,
      "For Harare or out-of-town drops, our order desk coordinates courier runs and scheduled trucks—share your destination and timing so we can plan the route.",
    ]),
    "If you’re organising recurring deliveries for a kitchen or institution, I can connect you with the wholesale desk to set up a standing order.",
  ].join("\n\n");
};

const buildDeliveryFollowUp = () =>
  [
    "To prepare a delivery, let me know:",
    formatBulletedList([
      "Your name and phone number so the driver can reach you on arrival.",
      "The delivery address plus any landmarks or gate instructions.",
      "Preferred delivery window or whether someone else will receive the order.",
    ]),
    "For diaspora gifts, include the recipient’s name and phone—our team will coordinate directly with them after payment.",
  ].join("\n\n");

const buildWholesaleOverview = () => {
  const wholesaleServices = services
    .filter((service) =>
      ["Wholesale Supply", "Pre-Pack Solutions", "Sourcing Services"].includes(
        service.title,
      ),
    )
    .map((service) => `${service.title}: ${service.description}`);

  return [
    "Here’s how we support wholesale partners:",
    formatBulletedList(wholesaleServices),
    "Submit the enquiry form at /#wholesale or share your requirements here and I’ll prepare a note for the team to respond with pricing and schedules.",
  ].join("\n\n");
};

const buildWholesaleFollowUp = () =>
  [
    "To speed up a wholesale quote, please include:",
    formatBulletedList([
      "Your company name, contact person, and best phone number.",
      "Product list with grades or pack sizes you prefer.",
      "Estimated volumes and how often you need deliveries.",
      "Drop-off location and preferred start date.",
    ]),
    "We can also arrange VAT-compliant invoicing and recurring deliveries if that helps your operation.",
  ].join("\n\n");

const buildLocationsOverview = () => {
  const locationDetails = locations
    .map((location) => {
      const servicesList = location.services
        .map((service) => `  · ${service}`)
        .join("\n");

      return `• ${location.city} — ${location.role}\n  Address: ${location.address}\n${servicesList}`;
    })
    .join("\n\n");

  return [
    "You can find us at:",
    locationDetails,
    "Harare currently hosts our administration and order desk while the full retail branch is in progress—share your Harare needs and we’ll coordinate pickup or delivery for you.",
  ].join("\n\n");
};

const buildLocationsFollowUp = () =>
  [
    "Planning a visit?",
    formatBulletedList([
      "Open the Google Maps links in the Locations section of our site for step-by-step directions.",
      "For large wholesale pickups, call ahead so we can stage your order in cold storage.",
      "Our Harare order desk can consolidate loads or schedule courier dispatches while the retail branch is finalised.",
    ]),
  ].join("\n\n");

const buildContactOverview = () => {
  const contactLines = contactDetails
    .filter((detail) => detail.label.toLowerCase() !== "hours")
    .map((detail) => `${detail.label}: ${detail.value}`);

  return [
    "Here’s how to reach Valley Farm Secrets:",
    formatBulletedList(contactLines),
    "Tell me which channel you prefer and I’ll include a summary so the right teammate is ready to help.",
  ].join("\n\n");
};

const buildContactFollowUp = () =>
  [
    "When reaching out, mention your order details, delivery timing, or documents you need so we can route your request quickly.",
    `For partnership proposals you can also email ${PARTNERS_EMAIL}, and I’m happy to prepare the context for that message too.`,
  ].join("\n\n");

const buildHoursOverview = () => {
  const hoursDetail = contactDetails.find((detail) =>
    detail.label.toLowerCase().includes("hours"),
  );

  return [
    hoursDetail
      ? `Our main store hours are ${hoursDetail.value}.`
      : "Our main store operates Monday to Saturday from 8:00 AM to 7:00 PM and is closed on Sundays.",
    "We rest on Sundays, but share any urgent requirements and the order desk will see what can be arranged.",
  ].join("\n\n");
};

const buildHoursFollowUp = () =>
  [
    "If you need an early pickup or after-hours bulk delivery, let me know your timing so I can ask the team about special arrangements.",
    "We share public holiday updates through our WhatsApp broadcasts—ask to join the list if you’d like reminders.",
  ].join("\n\n");

const buildHorticultureOverview = () => {
  const tipsList = horticultureTips.map(
    (tip) => `${tip.title}: ${tip.description}`,
  );

  return [
    "Here are some of the horticulture guides we’ve prepared:",
    formatBulletedList(tipsList),
    "Visit /horticulture-tips for the full articles or tell me about your crop and I’ll highlight the most relevant advice.",
  ].join("\n\n");
};

const buildHorticultureFollowUp = () =>
  [
    "Share the crop variety, growth stage, and any challenges (soil, pests, irrigation) and I can point you to the right guide or connect you with our agronomy partners.",
    "We’re also preparing downloadable checklists—let me know if you’d like to join the pilot group.",
  ].join("\n\n");

const buildPartnerOverview = () =>
  [
    "We love collaborating with organisations and producers:",
    formatBulletedList([
      "Support food security, farmer empowerment, and youth employment projects.",
      "Co-invest in cold storage, delivery fleets, or farmer network expansion.",
      "Run CSR, nutrition, and sustainability campaigns with measurable impact.",
      "Provide training, technology, or mentorship to build capacity.",
    ]),
    `Submit your proposal at /become-a-partner or email ${PARTNERS_EMAIL}. We review submissions within 5–7 working days and can schedule a follow-up call.`,
  ].join("\n\n");

const buildPartnerFollowUp = () =>
  [
    "To help us prepare for a partnership chat, share:",
    formatBulletedList([
      "Organisation or producer name and the main contact person.",
      "Focus area (funding, CSR collaboration, supply partnership, training, etc.).",
      "Project goals, timelines, and the communities you want to impact.",
      "Any supporting documents or references we should review.",
    ]),
    "Once we review your proposal we can line up the right decision makers for a strategy call.",
  ].join("\n\n");

const buildAccountsOverview = () => {
  const accountsService = services.find(
    (service) => service.title === "Corporate Accounts & Invoicing",
  );

  return [
    "Need formal billing or statements?",
    formatBulletedList([
      accountsService
        ? `Corporate Accounts & Invoicing: ${accountsService.description}`
        : "Corporate Accounts & Invoicing: Professional billing, VAT-compliant receipts, and Pastel integration.",
      "We provide Pastel-generated invoices, VAT receipts, and monthly statements for schools, NGOs, hospitality, and retailers.",
    ]),
    "Share your billing details and authorised purchasers so we can open the account and align on payment terms.",
  ].join("\n\n");
};

const buildAccountsFollowUp = () =>
  [
    "Have your company registration, VAT number (if applicable), and invoicing email ready so our finance desk can set you up quickly.",
    "We can also configure credit limits, purchase order requirements, or standing statements to suit your procurement process.",
  ].join("\n\n");

const buildPricingOverview = () =>
  [
    "Here’s how pricing works:",
    formatBulletedList([
      "Retail pricing and specials are listed on each product inside /store.",
      `Local biker delivery in Gweru is $${BIKER_DELIVERY_FEE.toFixed(2)}, while in-person collection is free.`,
      "Wholesale and institutional rates are quoted based on volume, season, and packaging—share your list and we’ll source the best value.",
    ]),
    "Let me know what you’re budgeting for and I’ll prepare it for the sales team to confirm availability and lead times.",
  ].join("\n\n");

const buildPricingFollowUp = () =>
  [
    "If you have a shopping list, paste it here with quantities and I’ll format it for the quoting team.",
    "We monitor market trends and can recommend seasonal substitutions if an item is scarce or priced high.",
  ].join("\n\n");

const buildQualityOverview = () => {
  const qualityList = whyChooseUsFeatures.map(
    (feature) => `${feature.title}: ${feature.description}`,
  );

  return [
    "Here’s what sets Valley Farm Secrets apart:",
    formatBulletedList(qualityList),
    "Explore /producers to meet the farms and cooperatives we partner with, or let me know if you’d like introductions for specific crops.",
  ].join("\n\n");
};

const buildQualityFollowUp = () =>
  [
    "We audit suppliers for freshness and sustainability—certificates and quality reports are available when you need them.",
    "If you require traceability documents or farm visit arrangements, tell me your requirements and I’ll coordinate with our sourcing lead.",
  ].join("\n\n");

const buildProducersOverview = () =>
  [
    "We work directly with farmers and cooperatives across Zimbabwe.",
    "Visit /producers to explore stories, photos, and seasonal highlights from the growers behind our produce.",
    "Tell me which crops or regions interest you and I’ll surface the relevant producers or introduce you to our sourcing team.",
  ].join("\n\n");

const buildProducersFollowUp = () =>
  [
    "Share your sourcing needs, preferred certifications, and volume targets so I can brief the producers’ desk for a tailored response.",
    "If you’re a grower looking to join the network, let me know your crop focus and harvest calendar and we’ll guide you through onboarding.",
  ].join("\n\n");

const buildGeneralOverview = () => {
  const serviceHighlights = services.map(
    (service) => `${service.title}: ${service.description}`,
  );

  return [
    "Valley Farm Secrets is your farm-to-table partner in Zimbabwe:",
    formatBulletedList(serviceHighlights),
    "Ask me anything about shopping, deliveries, wholesale supply, horticulture, or partnerships and I’ll share the answers before looping in a teammate.",
  ].join("\n\n");
};

const buildGeneralFollowUp = () =>
  [
    "Here’s how I can continue supporting you:",
    formatBulletedList([
      "Suggest products or specials based on what you’re looking for.",
      "Draft a wholesale, delivery, or partnership brief for the team to action.",
      "Point you to horticulture guides or producer stories that match your goals.",
      "Prepare a summary for WhatsApp or email so human teammates can pick up seamlessly.",
    ]),
    "Just let me know which direction you’d like to take next.",
  ].join("\n\n");

const getFollowUpForTopic = (topic: KnowledgeTopic) => {
  switch (topic) {
    case "store":
      return buildStoreFollowUp();
    case "delivery":
      return buildDeliveryFollowUp();
    case "wholesale":
      return buildWholesaleFollowUp();
    case "locations":
      return buildLocationsFollowUp();
    case "contact":
      return buildContactFollowUp();
    case "hours":
      return buildHoursFollowUp();
    case "horticulture":
      return buildHorticultureFollowUp();
    case "partner":
      return buildPartnerFollowUp();
    case "accounts":
      return buildAccountsFollowUp();
    case "pricing":
      return buildPricingFollowUp();
    case "quality":
      return buildQualityFollowUp();
    case "producers":
      return buildProducersFollowUp();
    case "general":
    case "greeting":
    case "support":
    default:
      return buildGeneralFollowUp();
  }
};

export function ValleyAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Hi there! I’m Valley AI, your AI assistant. I can help you compare products, plan deliveries, arrange wholesale supply, share horticulture tips, and prepare handovers to our team. How can I support you today?",
    },
  ]);
  const [lastTopic, setLastTopic] = useState<KnowledgeTopic | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const responseTimeoutRef = useRef<number | null>(null);
  const messageCountRef = useRef(messages.length);

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

  const escalationPrompt = useMemo(() => {
    const base =
      "Hello Valley Farm Secrets team! Valley AI could use a hand with a detailed request.";
    const body = lastUserQuestion
      ? `${base}\n\nCustomer shared: "${lastUserQuestion}"`
      : base;

    return encodeURIComponent(body);
  }, [lastUserQuestion]);

  const emailBody = useMemo(() => {
    const lines = [
      "Hi Valley Farm Secrets team,",
      "",
      "Please assist with this enquiry from the Valley AI assistant.",
    ];

    if (lastUserQuestion) {
      lines.push("", `Customer said: "${lastUserQuestion}"`);
    }

    lines.push("", "Thank you!");

    return encodeURIComponent(lines.join("\n"));
  }, [lastUserQuestion]);

  const hasUserMessages = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages],
  );

  const primaryQuickActions = quickActions.slice(0, 2);
  const extraQuickActions = quickActions.slice(2);
  const visibleQuickActions = resourcesExpanded
    ? quickActions
    : primaryQuickActions;
  const showSupportPanel = resourcesExpanded || hasUserMessages;

  const generateAssistantReply = useCallback(
    (userInput: string): AssistantReply => {
      const normalized = userInput.toLowerCase();
      const sanitized = normalized.replace(/[^a-z0-9\s]/g, " ");
      const includesTerm = (term: string) => sanitized.includes(term.toLowerCase());
      const includesAny = (terms: string[]) => terms.some((term) => includesTerm(term));

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-3 sm:bottom-6 sm:left-6">
      {isOpen ? (
        <div className="flex w-[min(88vw,18rem)] flex-col overflow-hidden rounded-3xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur transition-transform animate-in fade-in slide-in-from-bottom-4 supports-[backdrop-filter]:bg-background/75 sm:w-[19rem] md:w-[20rem]">
          <div className="flex items-start justify-between gap-2 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-4 py-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles
                  className="h-4 w-4 text-primary motion-safe:animate-pulse"
                  aria-hidden="true"
                />
                <span>Valley AI</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Flexible support for everything on Valley Farm Secrets
              </p>
            </div>
            <button
              type="button"
              onClick={toggleAssistant}
              className="rounded-full p-1.5 text-muted-foreground transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close Valley AI assistant"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div
            className="flex min-h-[10rem] max-h-[min(50vh,18rem)] flex-col gap-3 overflow-y-auto px-4 py-3 text-sm sm:max-h-[20rem]"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-busy={isResponding}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex animate-in fade-in slide-in-from-bottom-2",
                  message.role === "assistant" ? "justify-start" : "justify-end",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed shadow-sm transition-all duration-200",
                    message.role === "assistant"
                      ? "bg-primary/10 text-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isResponding ? (
              <div
                className="flex justify-start animate-in fade-in slide-in-from-bottom-2"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2 text-xs text-muted-foreground shadow-sm">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    <span
                      className="h-2 w-2 animate-pulse rounded-full bg-primary"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-2 w-2 animate-pulse rounded-full bg-primary"
                      style={{ animationDelay: "300ms" }}
                    />
                  </span>
                  Valley AI is thinking…
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="space-y-4 border-t border-dashed border-border/60 px-4 py-3 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick prompts
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {quickPromptOptions.map((option) => (
                  <Button
                    key={option.prompt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 rounded-full border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
                    onClick={() => sendMessage(option.prompt)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Guided resources
              </p>
              <ul className="grid gap-2">
                {visibleQuickActions.map((action) => (
                  <li key={action.href} className="animate-in fade-in-up">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="group h-auto w-full justify-between gap-2 rounded-2xl border-border/70 bg-background/70 px-3 py-2 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <Link href={action.href}>
                        <span className="flex flex-1 flex-col text-left">
                          <span className="text-sm font-medium text-foreground">
                            {action.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {action.description}
                          </span>
                        </span>
                        <ArrowUpRight
                          className="h-4 w-4 shrink-0 text-primary opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
              {extraQuickActions.length ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleResources}
                  className="h-auto self-start px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {resourcesExpanded
                    ? "Show fewer guides"
                    : `More guides (${extraQuickActions.length})`}
                </Button>
              ) : null}
            </div>

            {showSupportPanel ? (
              <div className="rounded-2xl bg-muted/30 p-3 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
                <p className="font-medium text-muted-foreground">
                  {hasUserMessages
                    ? "Need a teammate to take it from here? I can brief them with our chat history."
                    : "Ready when you are to connect you to the team with a full context summary."}
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="justify-between rounded-xl px-3 py-2 text-sm shadow-sm transition hover:shadow-md"
                    variant="secondary"
                  >
                    <a
                      href={`https://wa.me/${SUPPORT_WHATSAPP.replace("+", "")}?text=${escalationPrompt}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="flex items-center gap-2">
                        <PhoneCall className="h-4 w-4" aria-hidden="true" />
                        WhatsApp support
                      </span>
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="justify-between rounded-xl px-3 py-2 text-sm hover:bg-muted/60"
                  >
                    <a href={`mailto:${SUPPORT_EMAIL}?subject=${EMAIL_SUBJECT}&body=${emailBody}`}>
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Email support
                      </span>
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-border/60 bg-muted/20 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-muted/30"
          >
            <label htmlFor="valley-ai-message" className="sr-only">
              Message Valley AI
            </label>
            <Input
              id="valley-ai-message"
              ref={inputRef}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ask about products, orders, or tips..."
              className="h-9 flex-1 rounded-full border border-border/60 bg-background/80 text-sm transition focus-visible:border-primary/60 focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggleAssistant}
        className={cn(
          "relative flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          hasUnread && !isOpen ? "ring-2 ring-emerald-400/70" : "",
        )}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide Valley AI assistant" : "Open Valley AI assistant"}
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        <span>{isOpen ? "Hide Valley AI" : "Chat with Valley AI"}</span>
        {hasUnread && !isOpen ? (
          <>
            <span className="sr-only">Valley AI has a fresh update for you</span>
            <span
              className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-emerald-400"
              aria-hidden="true"
            />
            <span
              className="absolute -right-1.5 -top-1.5 h-3 w-3 animate-ping rounded-full bg-emerald-400/70"
              aria-hidden="true"
            />
          </>
        ) : null}
      </button>
    </div>
  );
}
