"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { navLinks } from "@/lib/nav-links";
import { Logo } from "../icons/logo";

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
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-sm shadow-md"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Valley Farm Secrets Home">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-headline text-2xl font-bold text-primary">
            Valley Farm Secrets
          </span>
        </Link>
        <nav className="hidden items-center gap-4 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent/10 hover:text-primary"
            >
              <link.icon aria-hidden="true" className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          ))}
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
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-lg font-semibold text-foreground/80 transition-colors hover:bg-accent/10 hover:text-primary"
                    >
                      <link.icon aria-hidden="true" className="h-5 w-5" />
                      <span>{link.label}</span>
                    </Link>
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
