import {
  Carrot,
  Beef,
  Truck,
  Building2,
  Apple,
  Warehouse,
  Leaf,
  HeartHandshake,
  ThumbsUp,
  Users,
  Sprout,
  Tractor,
  Combine,
  Flower,
  Phone,
  Mail,
  MapPin,
  Clock,
  BookOpen
} from "lucide-react";

export const services = [
  {
    icon: Carrot,
    title: "Fruit & Veg",
    description: "A wide variety of locally sourced, fresh fruits and vegetables.",
  },
  {
    icon: Beef,
    title: "Butchery",
    description: "Quality cuts of meat, processed with the highest standards of hygiene.",
  },
  {
    icon: Warehouse,
    title: "Grocery & Spices",
    description: "A selection of essential groceries and exotic spices to complement your meals.",
  },
  {
    icon: Truck,
    title: "Wholesale Supply",
    description: "Bulk supply of our fresh produce to businesses and restaurants.",
  },
  {
    icon: Building2,
    title: "Branch Network",
    description: "Conveniently located branches in major cities for easy access.",
  },
  {
    icon: Apple,
    title: "Producer Partnership",
    description: "We partner with local farmers to bring the best produce to the market.",
  },
];

export const whyChooseUsFeatures = [
    {
        icon: ThumbsUp,
        title: "Quality Assured",
        description: "We ensure every product meets our stringent quality standards for freshness and taste."
    },
    {
        icon: Users,
        title: "Community Driven",
        description: "By supporting local farmers, we strengthen our community and promote sustainable agriculture."
    },
    {
        icon: Leaf,
        title: "Sustainably Sourced",
        description: "Our commitment to sustainable farming practices helps protect the environment for future generations."
    },
    {
        icon: HeartHandshake,
        title: "Direct Partnerships",
        description: "We work directly with producers, ensuring fair prices and a transparent supply chain."
    }
];

export const locations = [
  {
    city: "Gweru",
    role: "Head Office & Main Store",
    address: "75 Main Street, Gweru, Zimbabwe",
    services: ["Retail", "Butchery", "Groceries", "Wholesale pick-ups"],
    mapLink: "https://www.google.com/maps/place/Valley+Farm+Secrets+-+Gweru/@-19.4532987,29.8133877,19.5z/data=!4m14!1m7!3m6!1s0x1934949bd34326b9:0x965f9389f867d850!2s75+Main+St,+Gweru!3b1!8m2!3d-19.4539183!4d29.8181887!3m5!1s0x193495958c4efd75:0x3bb86223848bd918!8m2!3d-19.4530493!4d29.813689!16s%2Fg%2F11txsg04x6?entry=ttu&g_ep=EgoyMDI1MDkwNy4wIKXMDSoASAFQAw%3D%3D"
  },
  {
    city: "Harare",
    role: "Administration & Order Desk",
    address: "Harare (full retail branch in progress, admin operations active)",
    services: ["Order coordination", "Account management", "Supply arrangements"],
    mapLink: "https://www.google.com/maps/place/Valley+Farm+Secrets/@-17.8335312,31.0504988,17z/data=!3m1!4b1!4m6!3m5!1s0x1931a55f3e0116f9:0x91393f1c21700bcb!8m2!3d-17.8335312!4d31.0504988!16s%2Fg%2F11h3m77mgn?entry=ttu&g_ep=EgoyMDI1MDkwNy4wIKXMDSoASAFQAw%3D%3D"
  }
];

export const contactDetails = [
    {
        icon: Phone,
        label: "WhatsApp / Call",
        value: "+263 788 679 000 / +263 711 406 919",
        href: "tel:+263788679000"
    },
     {
        icon: Phone,
        label: "Landline (Gweru)",
        value: "054 222 5955",
        href: "tel:0542225955"
    },
    {
        icon: Mail,
        label: "General Enquiries",
        value: "info@valleyfarmsecrets.com",
        href: "mailto:info@valleyfarmsecrets.com"
    },
    {
        icon: Mail,
        label: "Support",
        value: "support@valleyfarmsecrets.com",
        href: "mailto:support@valleyfarmsecrets.com"
    },
    {
        icon: MapPin,
        label: "Address",
        value: "75 Main Street, Gweru, Zimbabwe"
    },
    {
        icon: Clock,
        label: "Hours",
        value: "Mon-Sat: 8:00 AM - 7:00 PM, Sun: Closed"
    }
];

export const horticultureTips = [
    {
        icon: Sprout,
        title: "Soil Preparation",
        description: "Healthy soil is the foundation of a successful farm. Learn about composting, soil testing, and amendment strategies to create a nutrient-rich environment for your crops."
    },
    {
        icon: Tractor,
        title: "Integrated Pest Management",
        description: "Discover sustainable and effective ways to manage pests and diseases. We cover companion planting, beneficial insects, and organic pesticide options."
    },
    {
        icon: Combine,
        title: "Animal Husbandry",
        description: "Best practices for raising healthy livestock. This includes tips on feeding, housing, breeding, and disease prevention for various farm animals."
    },
    {
        icon: Flower,
        title: "Crop Rotation",
        description: "Understand the importance of crop rotation to maintain soil health, prevent disease buildup, and improve yields over the long term."
    },
    {
        icon: Leaf,
        title: "Water Conservation",
        description: "Learn smart irrigation techniques like drip irrigation and mulching to conserve water, a precious resource, while ensuring your crops thrive."
    },
    {
        icon: BookOpen,
        title: "Post-Harvest Handling",
        description: "Proper handling, storage, and transportation techniques to minimize post-harvest losses and ensure your produce reaches the market in prime condition."
    }
];
