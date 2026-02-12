export const BIKER_DELIVERY_FEE = 5;

export const SUPPORT_EMAIL = "info@valleyfarmsecrets.com";
export const SUPPORT_WHATSAPP = "+263788679000";
export const PARTNERS_EMAIL = "partners@valleyfarmsecrets.com";
export const EMAIL_SUBJECT = encodeURIComponent("Support request from Valley AI assistant");

export const quickActions = [
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

export const quickPromptOptions = [
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

export const storeKeywords = [
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

export const deliveryKeywords = [
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

export const wholesaleKeywords = [
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

export const horticultureKeywords = [
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

export const locationKeywords = [
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

export const hoursKeywords = [
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

export const contactKeywords = [
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

export const pricingKeywords = [
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

export const accountsKeywords = [
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

export const partnerKeywords = [
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

export const producersKeywords = [
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

export const qualityKeywords = [
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

export const generalKeywords = [
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

export const greetingKeywords = [
    "hello",
    "hi",
    "hey",
    "good morning",
    "good afternoon",
    "good evening",
    "greetings",
    "howdy",
];

export const thanksKeywords = [
    "thank",
    "thanks",
    "appreciate",
    "grateful",
    "cheers",
];

export const moreInfoKeywords = [
    "tell me more",
    "more detail",
    "more details",
    "more info",
    "anything else",
    "what else",
    "elaborate",
    "expand",
];

export const escalateKeywords = [
    "human",
    "real person",
    "agent",
    "someone",
    "person",
    "representative",
    "escalate",
];
