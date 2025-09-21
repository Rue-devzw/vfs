import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Handshake,
  Images,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  Sprout,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon?: LucideIcon;
};

export const navLinks: NavLink[] = [
  { href: "/producers", label: "For Producers", icon: Sprout },
  { href: "/become-a-partner", label: "Partner With Us", icon: Handshake },
  { href: "/#services", label: "Services", icon: Briefcase },
  { href: "/#locations", label: "Branches", icon: MapPin },
  { href: "/#gallery", label: "Gallery", icon: Images },
  { href: "/#wholesale", label: "Wholesale", icon: Package },
  { href: "/#contact", label: "Contact Us", icon: Phone },
  { href: "/store", label: "Online Store", icon: ShoppingBag },
];
