import Link from "next/link";
import { Sprout, Facebook, Instagram } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";

const navLinks = [
  { href: "/become-a-partner", label: "Become a Partner" },
  { href: "/#services", label: "Services" },
  { href: "/#locations", label: "Branches" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#wholesale", label: "Wholesale" },
  { href: "/#contact", label: "Contact Us" },
  { href: "/store", label: "Online Store" },
];

export function Footer() {
  return (
    <footer className="bg-primary/5 py-12">
      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 md:grid-cols-3 md:px-6">
        {/* Column 1: Branding */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <Link href="/" className="flex items-center gap-2" aria-label="Valley Farm Secrets Home">
            <Sprout className="h-8 w-8 text-primary" />
            <span className="font-headline text-2xl font-bold text-primary">
              Valley Farm Secrets
            </span>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Freshness. Quality. Convenience.
          </p>
          <p className="mt-8 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Valley Farm Secrets. All rights reserved.
          </p>
        </div>

        {/* Column 2: Quick Links */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h3 className="font-headline text-lg font-bold">Quick Links</h3>
          <nav className="mt-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Column 3: Contact & Socials */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h3 className="font-headline text-lg font-bold">Get in Touch</h3>
          <div className="mt-4 flex flex-col gap-2">
            <a href="mailto:info@valleyfarmsecrets.com" className="text-sm text-muted-foreground transition-colors hover:text-primary">
              Email: info@valleyfarmsecrets.com
            </a>
            <a href="tel:+263777777777" className="text-sm text-muted-foreground transition-colors hover:text-primary">
              WhatsApp: +263 777 777 777
            </a>
          </div>
          <div className="mt-6 flex gap-4">
            <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground transition-colors hover:text-primary"><Facebook /></a>
            <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground transition-colors hover:text-primary"><Instagram /></a>
            <a href="https://wa.me/263777777777" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-muted-foreground transition-colors hover:text-primary"><WhatsAppIcon /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
