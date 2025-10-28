import {
  Boxes,
  Cog,
  Handshake,

  LucideIcon,
  MapPin,
  PhoneCall,
  ShoppingCart,
  Sprout,
} from "lucide-react";

export type NavLinkTone = "primary" | "accent" | "muted";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: NavLinkTone;
};

export const navLinks: NavLink[] = [
  {
    href: "/producers",
    label: "For Producers",
    icon: Sprout,
    tone: "primary",
  },
  {
    href: "/become-a-partner",
    label: "Partner With Us",
    icon: Handshake,
    tone: "accent",
  },
  {
    href: "/#services",
    label: "Services",
    icon: Cog,
    tone: "primary",
  },
  {
    href: "/#locations",
    label: "Branches",
    icon: MapPin,
    tone: "accent",

    href: "/#wholesale",
    label: "Wholesale",
    icon: Boxes,
    tone: "primary",
  },
  {
    href: "/#contact",
    label: "Contact Us",
    icon: PhoneCall,
    tone: "accent",
  },
  {
    href: "/store",
    label: "Online Store",
    icon: ShoppingCart,
    tone: "primary",
  },
];
