"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronsLeftRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { navLinks } from "@/lib/nav-links";
import type { NavLink as NavLinkConfig } from "@/lib/nav-links";
import { Logo } from "../icons/logo";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";

const toneClassMap: Record<NavLinkConfig["tone"], string> = {
  primary: "text-primary",
  accent: "text-accent",
  muted: "text-muted-foreground",
};

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMenubarOpen, setIsMenubarOpen] = useState(true);
  const router = useRouter();

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
        <nav className="hidden items-center gap-3 md:flex">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsMenubarOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-primary/5"
            aria-expanded={isMenubarOpen}
            aria-controls="primary-menubar"
          >
            <ChevronsLeftRight
              className={cn(
                "h-4 w-4 transition-transform",
                isMenubarOpen ? "rotate-0" : "-rotate-180"
              )}
            />
            <span>{isMenubarOpen ? "Fold menu" : "Unfold menu"}</span>
          </Button>
          <div
            className={cn(
              "overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-in-out",
              isMenubarOpen ? "max-w-4xl opacity-100 translate-y-0" : "max-w-0 -translate-y-1 opacity-0"
            )}
          >
            <Menubar
              id="primary-menubar"
              className="flex h-11 items-center space-x-1 rounded-full border border-border/60 bg-background/85 px-2 shadow-sm backdrop-blur"
            >
              {navLinks.map((link) => {
                const Icon = link.icon;
                const toneClass = toneClassMap[link.tone];
                return (
                  <MenubarMenu key={link.href}>
                    <MenubarTrigger
                      className={cn(
                        "group flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:bg-primary/10 data-[state=open]:text-primary",
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "h-4 w-4 transition-colors",
                          toneClass,
                          "group-hover:text-primary group-focus-visible:text-primary group-data-[state=open]:text-primary"
                        )}
                      />
                      <span
                        className={cn(
                          "transition-colors",
                          toneClass,
                          "group-hover:text-primary group-focus-visible:text-primary group-data-[state=open]:text-primary"
                        )}
                      >
                        {link.label}
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className="ml-1 h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                      />
                    </MenubarTrigger>
                    <MenubarContent className="min-w-[14rem] rounded-xl border border-border/70 bg-background/95 p-2 shadow-xl backdrop-blur">
                      <MenubarLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Icon aria-hidden="true" className={cn("h-4 w-4", toneClass)} />
                        {link.label}
                      </MenubarLabel>
                      <MenubarSeparator className="my-2" />
                      <MenubarItem
                        onSelect={(event) => {
                          event.preventDefault();
                          router.push(link.href);
                        }}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
                      >
                        Visit {link.label}
                        <ArrowRight aria-hidden="true" className="h-4 w-4 text-primary" />
                      </MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                );
              })}
            </Menubar>
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
