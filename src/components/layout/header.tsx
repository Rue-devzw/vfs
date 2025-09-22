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

main
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
main
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

main
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
main
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
