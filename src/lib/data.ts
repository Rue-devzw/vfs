import {
  Carrot,
  Beef,
  Truck,
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
  BookOpen,
  ShoppingBasket,
  Package,
  Search,
  FileText,
  Laptop
} from "lucide-react";

export const services = [
  {
    icon: Carrot,
    title: "Fruit & Vegetables",
    description: "Retail & wholesale supply of all fruits and vegetables: cabbages, carrots, green beans, green pepper, tomatoes, watermelon, cucumber, and more.",
    purchaseLink: "/store?category=Fruit%20%26%20Veg",
    purchaseLabel: "Shop Fruit & Veg",
    image: "/images/hero-produce.webp",
  },
  {
    icon: Beef,
    title: "Butchery",
    description: "Fresh beef, lamb, goat, rabbit, chicken, fish, mince, sausages, braai packs; cold-room managed for guaranteed freshness.",
    purchaseLink: "/store?category=Butchery",
    purchaseLabel: "Shop Butchery",
    image: "/images/product-steak.webp",
  },
  {
    icon: ShoppingBasket,
    title: "Grocery & Spices",
    description: "Essentials like bread, sugar, flour, milk, cooking oil, plus Valley Farm Secrets branded spice packs.",
    purchaseLink: "/store?category=Grocery%20%26%20Spices",
    purchaseLabel: "Shop Groceries & Spices",
    image: "/images/product-spices.webp",
  },
  {
    icon: Truck,
    title: "Wholesale Supply",
    description: "Scheduled deliveries & bulk orders for schools, colleges, churches, NGOs, and hospitality businesses.",
    purchaseLink: "/#wholesale",
    purchaseLabel: "Request Wholesale Supply",
    image: "/images/hero-5.webp",
  },
  {
    icon: Package,
    title: "Pre-Pack Solutions",
    description: "Graded, chopped, and portion-packed vegetables ready for kitchens.",
    purchaseLink: "/#wholesale",
    purchaseLabel: "Request Pre-Pack Solutions",
    image: "/images/product-broccoli.webp",
  },
  {
    icon: Search,
    title: "Sourcing Services",
    description: "We secure hard-to-find produce & volumes at competitive prices.",
    purchaseLink: "/#contact",
    purchaseLabel: "Talk to Our Team",
    image: "/images/hero-4.webp",
  },
  {
    icon: FileText,
    title: "Corporate Accounts & Invoicing",
    description: "Professional billing, VAT-compliant receipts, and Pastel accounting.",
    purchaseLink: "/#contact",
    purchaseLabel: "Set Up an Account",
    image: "/images/hero-7.webp",
  },
  {
    icon: Laptop,
    title: "Valley Farm Digital (Coming Soon)",
    description: "Kitchenware, Office ware, and Electronics under one roof.",
    purchaseLink: "/store",
    purchaseLabel: "Explore Our Store",
    image: "/images/office-and-kitchenware.webp",
  }
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
    role: "Regional Office, Main Store & Order Desk",
    address: "75 Main Street, Gweru, Zimbabwe",
    services: ["Retail", "Butchery", "Groceries", "Wholesale pick-ups"],
    mapLink: "https://www.google.com/maps/place/Valley+Farm+Secrets+-+Gweru/@-19.4532987,29.8133877,19.5z/data=!4m14!1m7!3m6!1s0x1934949bd34326b9:0x965f9389f867d850!2s75+Main+St,+Gweru!3b1!8m2!3d-19.4539183!4d29.8181887!3m5!1s0x193495958c4efd75:0x3bb86223848bd918!8m2!3d-19.4530493!4d29.813689!16s%2Fg%2F11txsg04x6?entry=ttu&g_ep=EgoyMDI1MDkwNy4wIKXMDSoASAFQAw%3D%3D",
    mapEmbedUrl: "https://maps.google.com/maps?q=-19.4532987,29.8133877&z=17&output=embed"
  },
  {
    city: "Harare",
    role: "Head Office, Main Store & Order Desk",
    address: "Harare (head office campus with main store and order desk)",
    services: ["Order coordination", "Account management", "Supply arrangements"],
    mapLink: "https://www.google.com/maps/place/Valley+Farm+Secrets/@-17.8335312,31.0504988,17z/data=!3m1!4b1!4m6!3m5!1s0x1931a55f3e0116f9:0x91393f1c21700bcb!8m2!3d-17.8335312!4d31.0504988!16s%2Fg%2F11h3m77mgn?entry=ttu&g_ep=EgoyMDI1MDkwNy4wIKXMDSoASAFQAw%3D%3D",
    mapEmbedUrl: "https://maps.google.com/maps?q=-17.8335312,31.0504988&z=16&output=embed"
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
