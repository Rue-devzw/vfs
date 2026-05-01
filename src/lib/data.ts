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
    image: "/images/hero-5.webp",
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
    image: "/images/hero-7.webp",
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
    title: "Valleyfarm Digital Services",
    description: "Purchase ZESA tokens, buy airtime, and pay your utility bills in one place.",
    purchaseLink: "/digital",
    purchaseLabel: "Explore Digital Services",
    image: "/images/zetdc-logo.png",
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

function buildGoogleMapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

function buildGoogleMapsEmbedUrl(lat: number, lng: number, zoom: number) {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=${zoom}&output=embed`;
}

export const locations = [
  {
    city: "Gweru",
    role: "Regional Office, Main Store & Order Desk",
    address: "75 Main Street, Gweru, Zimbabwe",
    services: ["Retail", "Butchery", "Groceries", "Wholesale pick-ups"],
    mapLink: buildGoogleMapsLink(-19.45313512516735, 29.81378330418011),
    mapEmbedUrl: buildGoogleMapsEmbedUrl(-19.45313512516735, 29.81378330418011, 17),
  },
  {
    city: "Harare",
    role: "Head Office, Main Store & Order Desk",
    address: "Harare (head office campus with main store and order desk)",
    services: ["Order coordination", "Account management", "Supply arrangements"],
    mapLink: buildGoogleMapsLink(-17.833085079390813, 31.051368657867144),
    mapEmbedUrl: buildGoogleMapsEmbedUrl(-17.833085079390813, 31.051368657867144, 16),
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
