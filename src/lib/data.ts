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
    role: "Distribution Hub & Main Store",
    address: "123 Fresh Produce Ave, Gweru",
    services: ["Fruit & Veg", "Butchery", "Wholesale", "Groceries"],
    mapLink: "https://www.google.com/maps/search/?api=1&query=Gweru"
  },
  {
    city: "Harare",
    role: "City Branch & Collection Point",
    address: "456 Capital Gardens, Harare",
    services: ["Fruit & Veg", "Butchery", "Online Order Pickup"],
    mapLink: "https://www.google.com/maps/search/?api=1&query=Harare"
  }
];

export const contactDetails = [
    {
        icon: Phone,
        label: "Phone / WhatsApp",
        value: "+263 777 777 777",
        href: "tel:+263777777777"
    },
    {
        icon: Mail,
        label: "Email",
        value: "info@valleyfarmsecrets.com",
        href: "mailto:info@valleyfarmsecrets.com"
    },
    {
        icon: MapPin,
        label: "Address",
        value: "123 Fresh Produce Ave, Gweru, Zimbabwe"
    },
    {
        icon: Clock,
        label: "Hours",
        value: "Mon-Sat: 8:00 AM - 6:00 PM"
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
