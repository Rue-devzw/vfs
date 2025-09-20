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
};

export const navLinks: NavLink[] = [
  {
    href: "/producers",
    label: "For Producers",
    icon: Sprout,
  },
  {
    href: "/become-a-partner",
    label: "Partner With Us",
    icon: Handshake,
  },
  {
    href: "/#services",
    label: "Services",
    icon: Cog,
  },
  {
    href: "/#locations",
    label: "Branches",
    icon: MapPin,
  },
  {
    href: "/#gallery",
    label: "Gallery",
    icon: Images,
  },
  {
    href: "/#wholesale",
    label: "Wholesale",
    icon: Boxes,
  },
  {
    href: "/#contact",
    label: "Contact Us",
    icon: PhoneCall,
  },
  {
    href: "/store",
    label: "Online Store",
    icon: ShoppingCart,
  },
];
