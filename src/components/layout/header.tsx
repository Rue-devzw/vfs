"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronUp, Menu } from "lucide-react";
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
  const [isDesktopNavOpen, setIsDesktopNavOpen] = useState(true);

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
      {/* Assuming there was content for the header here that was accidentally deleted or replaced by 'main' */}
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
            <Logo className="h-8 w-8" />
            <span className="sr-only">Home</span>
          </Link>
          {/* ... other header content */}
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

  if (link.href.startsWith("http")) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={cn(
          "group flex items-center gap-3 rounded-md p-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          variant === "desktop" ? "hover:bg-muted/60" : "hover:bg-muted"
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "h-5 w-5 transition-colors group-hover:text-primary group-focus-visible:text-primary",
            toneClass
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
      </a>
    );
  }

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-md p-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variant === "desktop" ? "hover:bg-muted/60" : "hover:bg-muted"
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "h-5 w-5 transition-colors group-hover:text-primary group-focus-visible:text-primary",
          toneClass
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
