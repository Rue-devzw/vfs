import {
    contactDetails,
    horticultureTips,
    locations,
    services,
    whyChooseUsFeatures,
} from "@/lib/data";
import { KnowledgeTopic } from "../types";
import { BIKER_DELIVERY_FEE, PARTNERS_EMAIL } from "./constants";

export const createId = () => Math.random().toString(36).slice(2, 10);

export const formatBulletedList = (items: string[]) =>
    items
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => `• ${item}`)
        .join("\n");

export const buildRetailOverview = () => {
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

export const buildStoreFollowUp = () =>
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

export const buildDeliveryOverview = () => {
    const hoursDetail = contactDetails.find((detail) =>
        detail.label.toLowerCase().includes("hours"),
    );

    return [
        "Delivery & collection options:",
        formatBulletedList([
            `Free in-person collection from 75 Main Street, Gweru${hoursDetail ? ` (${hoursDetail.value})` : ""
            }`,
            `Biker delivery within Gweru for $${BIKER_DELIVERY_FEE.toFixed(2)} with pay-now or pay-on-delivery choices.`,
            "For Harare or out-of-town drops, our order desk coordinates courier runs and scheduled trucks—share your destination and timing so we can plan the route.",
        ]),
        "If you’re organising recurring deliveries for a kitchen or institution, I can connect you with the wholesale desk to set up a standing order.",
    ].join("\n\n");
};

export const buildDeliveryFollowUp = () =>
    [
        "To prepare a delivery, let me know:",
        formatBulletedList([
            "Your name and phone number so the driver can reach you on arrival.",
            "The delivery address plus any landmarks or gate instructions.",
            "Preferred delivery window or whether someone else will receive the order.",
        ]),
        "For diaspora gifts, include the recipient’s name and phone—our team will coordinate directly with them after payment.",
    ].join("\n\n");

export const buildWholesaleOverview = () => {
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

export const buildWholesaleFollowUp = () =>
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

export const buildLocationsOverview = () => {
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
        "Harare hosts our head office, main store, and order desk—share your Harare needs and we’ll coordinate pickup or delivery for you.",
    ].join("\n\n");
};

export const buildLocationsFollowUp = () =>
    [
        "Planning a visit?",
        formatBulletedList([
            "Open the Google Maps links in the Locations section of our site for step-by-step directions.",
            "For large wholesale pickups, call ahead so we can stage your order in cold storage.",
            "Our Harare head office order desk can consolidate loads or schedule courier dispatches for regional and out-of-town routes.",
        ]),
    ].join("\n\n");

export const buildContactOverview = () => {
    const contactLines = contactDetails
        .filter((detail) => detail.label.toLowerCase() !== "hours")
        .map((detail) => `${detail.label}: ${detail.value}`);

    return [
        "Here’s how to reach Valley Farm Secrets:",
        formatBulletedList(contactLines),
        "Tell me which channel you prefer and I’ll include a summary so the right teammate is ready to help.",
    ].join("\n\n");
};

export const buildContactFollowUp = () =>
    [
        "When reaching out, mention your order details, delivery timing, or documents you need so we can route your request quickly.",
        `For partnership proposals you can also email ${PARTNERS_EMAIL}, and I’m happy to prepare the context for that message too.`,
    ].join("\n\n");

export const buildHoursOverview = () => {
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

export const buildHoursFollowUp = () =>
    [
        "If you need an early pickup or after-hours bulk delivery, let me know your timing so I can ask the team about special arrangements.",
        "We share public holiday updates through our WhatsApp broadcasts—ask to join the list if you’d like reminders.",
    ].join("\n\n");

export const buildHorticultureOverview = () => {
    const tipsList = horticultureTips.map(
        (tip) => `${tip.title}: ${tip.description}`,
    );

    return [
        "Here are some of the horticulture guides we’ve prepared:",
        formatBulletedList(tipsList),
        "Visit /horticulture-tips for the full articles or tell me about your crop and I’ll highlight the most relevant advice.",
    ].join("\n\n");
};

export const buildHorticultureFollowUp = () =>
    [
        "Share the crop variety, growth stage, and any challenges (soil, pests, irrigation) and I can point you to the right guide or connect you with our agronomy partners.",
        "We’re also preparing downloadable checklists—let me know if you’d like to join the pilot group.",
    ].join("\n\n");

export const buildPartnerOverview = () =>
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

export const buildPartnerFollowUp = () =>
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

export const buildAccountsOverview = () => {
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

export const buildAccountsFollowUp = () =>
    [
        "Have your company registration, VAT number (if applicable), and invoicing email ready so our finance desk can set you up quickly.",
        "We can also configure credit limits, purchase order requirements, or standing statements to suit your procurement process.",
    ].join("\n\n");

export const buildPricingOverview = () =>
    [
        "Here’s how pricing works:",
        formatBulletedList([
            "Retail pricing and specials are listed on each product inside /store.",
            `Local biker delivery in Gweru is $${BIKER_DELIVERY_FEE.toFixed(2)}, while in-person collection is free.`,
            "Wholesale and institutional rates are quoted based on volume, season, and packaging—share your list and we’ll source the best value.",
        ]),
        "Let me know what you’re budgeting for and I’ll prepare it for the sales team to confirm availability and lead times.",
    ].join("\n\n");

export const buildPricingFollowUp = () =>
    [
        "If you have a shopping list, paste it here with quantities and I’ll format it for the quoting team.",
        "We monitor market trends and can recommend seasonal substitutions if an item is scarce or priced high.",
    ].join("\n\n");

export const buildQualityOverview = () => {
    const qualityList = whyChooseUsFeatures.map(
        (feature) => `${feature.title}: ${feature.description}`,
    );

    return [
        "Here’s what sets Valley Farm Secrets apart:",
        formatBulletedList(qualityList),
        "Explore /producers to meet the farms and cooperatives we partner with, or let me know if you’d like introductions for specific crops.",
    ].join("\n\n");
};

export const buildQualityFollowUp = () =>
    [
        "We audit suppliers for freshness and sustainability—certificates and quality reports are available when you need them.",
        "If you require traceability documents or farm visit arrangements, tell me your requirements and I’ll coordinate with our sourcing lead.",
    ].join("\n\n");

export const buildProducersOverview = () =>
    [
        "We work directly with farmers and cooperatives across Zimbabwe.",
        "Visit /producers to explore stories, photos, and seasonal highlights from the growers behind our produce.",
        "Tell me which crops or regions interest you and I’ll surface the relevant producers or introduce you to our sourcing team.",
    ].join("\n\n");

export const buildProducersFollowUp = () =>
    [
        "Share your sourcing needs, preferred certifications, and volume targets so I can brief the producers’ desk for a tailored response.",
        "If you’re a grower looking to join the network, let me know your crop focus and harvest calendar and we’ll guide you through onboarding.",
    ].join("\n\n");

export const buildGeneralOverview = () => {
    const serviceHighlights = services.map(
        (service) => `${service.title}: ${service.description}`,
    );

    return [
        "Valley Farm Secrets is your farm-to-table partner in Zimbabwe:",
        formatBulletedList(serviceHighlights),
        "Ask me anything about shopping, deliveries, wholesale supply, horticulture, or partnerships and I’ll share the answers before looping in a teammate.",
    ].join("\n\n");
};

export const buildGeneralFollowUp = () =>
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

export const getFollowUpForTopic = (topic: KnowledgeTopic) => {
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
