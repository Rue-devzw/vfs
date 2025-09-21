import Link from "next/link";
import { Facebook, Instagram } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { Logo } from "../icons/logo";
import { navLinks } from "@/lib/nav-links";

export function Footer() {
  return (
    <footer className="bg-primary/5 py-12">
      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 md:grid-cols-4 md:px-6">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <Link href="/" className="flex items-center gap-2" aria-label="Valley Farm Secrets Home">
            <Logo className="h-8 w-8 text-primary" />
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

        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h3 className="font-headline text-lg font-bold">Shop &amp; Explore</h3>
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

        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h3 className="font-headline text-lg font-bold">Business Solutions</h3>
          <nav className="mt-4 flex flex-col gap-2">
            <Link href="/store#wholesale" className="text-sm text-muted-foreground transition-colors hover:text-primary">Wholesale Supply</Link>
            <Link href="/store#shop-prepack" className="text-sm text-muted-foreground transition-colors hover:text-primary">Pre-Pack Solutions</Link>
            <Link href="/store#sourcing" className="text-sm text-muted-foreground transition-colors hover:text-primary">Sourcing Services</Link>
            <Link href="/store#corporate" className="text-sm text-muted-foreground transition-colors hover:text-primary">Corporate Accounts</Link>
            <Link href="/store#digital" className="text-sm text-muted-foreground transition-colors hover:text-primary">Valley Farm Digital</Link>
          </nav>
        </div>

        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h3 className="font-headline text-lg font-bold">Support &amp; Policies</h3>
          <nav className="mt-4 flex flex-col gap-2">
            <Link href="/store#account" className="text-sm text-muted-foreground transition-colors hover:text-primary">My Account</Link>
            <Link href="/privacy-policy" className="text-sm text-muted-foreground transition-colors hover:text-primary">Privacy Policy</Link>
            <Link href="/terms-of-service" className="text-sm text-muted-foreground transition-colors hover:text-primary">Terms of Service</Link>
            <Link href="/store#contact" className="text-sm text-muted-foreground transition-colors hover:text-primary">Customer Support</Link>
          </nav>
          <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground">
            <a href="mailto:info@valleyfarmsecrets.com" className="transition-colors hover:text-primary">info@valleyfarmsecrets.com</a>
            <a href="tel:+263788679000" className="transition-colors hover:text-primary">WhatsApp: +263 788 679 000</a>
          </div>
          <div className="mt-6 flex gap-4">
            <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground transition-colors hover:text-primary"><Facebook /></a>
            <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground transition-colors hover:text-primary"><Instagram /></a>
            <a href="https://wa.me/263788679000" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-muted-foreground transition-colors hover:text-primary"><WhatsAppIcon /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
