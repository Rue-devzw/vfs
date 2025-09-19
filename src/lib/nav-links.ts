import {
  Boxes,
  Cog,
  Handshake,
  Images,
  LucideIcon,
  MapPin,
  PhoneCall,
  ShoppingCart,
  Sprout,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  colorClass: string;
};

export const navLinks: NavLink[] = [
  {
    href: "/producers",
    label: "For Producers",
    icon: Sprout,
    colorClass: "text-emerald-500",
  },
  {
    href: "/become-a-partner",
    label: "Partner With Us",
    icon: Handshake,
    colorClass: "text-sky-500",
  },
  {
    href: "/#services",
    label: "Services",
    icon: Cog,
    colorClass: "text-purple-500",
  },
  {
    href: "/#locations",
    label: "Branches",
    icon: MapPin,
    colorClass: "text-rose-500",
  },
  {
    href: "/#gallery",
    label: "Gallery",
    icon: Images,
    colorClass: "text-amber-500",
  },
  {
    href: "/#wholesale",
    label: "Wholesale",
    icon: Boxes,
    colorClass: "text-lime-500",
  },
  {
    href: "/#contact",
    label: "Contact Us",
    icon: PhoneCall,
    colorClass: "text-orange-500",
  },
  {
    href: "/store",
    label: "Online Store",
    icon: ShoppingCart,
    colorClass: "text-blue-500",
  },
];
