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

const toneSurfaceClassMap: Record<NavLinkConfig["tone"], string> = {
  primary: "bg-primary/15 text-primary",
  accent: "bg-accent/15 text-accent",
  muted: "bg-muted/20 text-muted-foreground",
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
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between md:h-24">
          <Link href="/" className="flex items-center gap-2" aria-label="Valley Farm Secrets Home">
            <Logo className="h-8 w-8 text-primary" />
            <span className="font-headline text-2xl font-bold text-primary">
              Valley Farm Secrets
            </span>
          </Link>
          <div className="hidden items-center gap-3 md:flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDesktopNavOpen(prev => !prev)}
              className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-primary/5"
              aria-expanded={isDesktopNavOpen}
              aria-controls="desktop-navigation"
            >
              {isDesktopNavOpen ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{isDesktopNavOpen ? "Hide navigation" : "Browse navigation"}</span>
            </Button>
          </div>
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
                    {navLinks.map(link => (
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
        <div
          id="desktop-navigation"
          className={cn(
            "hidden overflow-hidden transition-[max-height,opacity,transform] duration-500 ease-in-out md:block",
            isDesktopNavOpen
              ? "pointer-events-auto max-h-[420px] opacity-100 translate-y-0"
              : "pointer-events-none max-h-0 opacity-0 -translate-y-2"
          )}
          aria-hidden={!isDesktopNavOpen}
        >
          <nav className="mt-3 grid grid-cols-2 gap-3 rounded-3xl border border-border/60 bg-background/90 p-5 shadow-lg backdrop-blur md:grid-cols-4">
            {navLinks.map(link => (
              <NavigationLinkItem key={link.href} link={link} variant="desktop" />
            ))}
          </nav>
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

  if (variant === "desktop") {
    return (
      <Link
        href={link.href}
        onClick={() => onNavigate?.()}
        className="group flex h-full items-center justify-between rounded-2xl border border-border/60 bg-background/85 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="flex items-center gap-4">
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
              toneSurfaceClassMap[link.tone]
            )}
          >
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <span
            className={cn(
              "text-base font-semibold tracking-tight transition-colors",
              toneClass,
              "group-hover:text-primary group-focus-visible:text-primary"
            )}
          >
            {link.label}
          </span>
        </span>
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary group-focus-visible:translate-x-1 group-focus-visible:text-primary"
        />
      </Link>
    );
  }

  return (
    <Link
      href={link.href}
      onClick={() => onNavigate?.()}
      className={cn(
        "group flex items-center gap-3 rounded-full border border-border/50 bg-background px-4 py-2 text-base font-medium transition-all hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "h-5 w-5 transition-colors",
          toneClass,
          "group-hover:text-primary group-focus-visible:text-primary"
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
