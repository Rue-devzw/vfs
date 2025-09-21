"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { navLinks } from "@/lib/nav-links";
import type { NavLink as NavLinkConfig } from "@/lib/nav-links";
import { Logo } from "../icons/logo";

const toneClassMap: Record<NavLinkConfig["tone"], string> = {
  primary: "text-primary",
  accent: "text-accent",
  muted: "text-muted-foreground",
};

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/40 transition-all duration-300",
        isScrolled
          ? "bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
          : "bg-background/80"
      )}
    >
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 md:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="Valley Farm Secrets Home">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-headline text-2xl font-bold text-primary">
            Valley Farm Secrets
          </span>
        </Link>
        <nav className="hidden md:flex">
          <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 py-1 shadow-sm backdrop-blur">
            {navLinks.map((link) => (
              <NavigationLinkItem key={link.href} link={link} variant="desktop" />
            ))}
          </div>
        </nav>
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm bg-background p-0">
              <SheetTitle className="sr-only">Mobile Menu</SheetTitle>
              <div className="flex h-full flex-col">
                <div className="p-6">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                    <Logo className="h-7 w-7 text-primary" />
                    <span className="font-headline text-xl font-bold text-primary">
                      Valley Farm Secrets
                    </span>
                  </Link>
                </div>
                <nav className="mt-4 flex flex-col gap-2 p-6 pt-0">
                  {navLinks.map((link) => (
                    <NavigationLinkItem
                      key={link.href}
                      link={link}
                      variant="mobile"
                      onNavigate={() => setIsMobileMenuOpen(false)}
                    />
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

type NavigationLinkItemProps = {
  link: NavLinkConfig;
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
};

function NavigationLinkItem({ link, variant, onNavigate }: NavigationLinkItemProps) {
  const Icon = link.icon;
  const toneClass = toneClassMap[link.tone];

  return (
    <Link
      href={link.href}
      onClick={onNavigate ? () => onNavigate() : undefined}
      className={cn(
        "group items-center gap-2 rounded-full px-4 py-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variant === "desktop"
          ? "inline-flex text-sm hover:bg-primary/5"
          : "flex text-lg hover:bg-primary/10"
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          variant === "desktop" ? "h-4 w-4" : "h-5 w-5",
          toneClass,
          "transition-colors group-hover:text-primary group-focus-visible:text-primary"
        )}
      />
      <span
        className={cn(
          toneClass,
          "transition-colors group-hover:text-primary group-focus-visible:text-primary"
        )}
      >
        {link.label}
      </span>
    </Link>
  );
}
