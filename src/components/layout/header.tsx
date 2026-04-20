'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { navLinks } from '@/lib/nav-links';
import type { NavLink as NavLinkConfig } from '@/lib/nav-links';
import { Logo } from '../icons/logo';
import { ModeToggle } from '../mode-toggle';
import { CurrencySwitcher } from '@/components/currency/currency-switcher';

const toneClassMap: Record<NavLinkConfig['tone'], string> = {
  primary: 'text-primary',
  accent: 'text-accent',
  muted: 'text-muted-foreground',
};

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border/60 transition-all duration-300',
        isScrolled
          ? 'bg-background/88 shadow-[0_16px_40px_-28px_rgba(17,24,39,0.35)] backdrop-blur-xl'
          : 'bg-background/74 backdrop-blur-lg'
      )}
    >
      <div className="container mx-auto px-4 py-3 md:px-6">
        <div className="hidden min-h-[84px] items-center gap-6 lg:grid lg:grid-cols-[minmax(260px,320px)_1fr_auto]">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-4 px-1 py-1 transition-transform duration-200 hover:-translate-y-0.5"
            aria-label="Valley Farm Secrets Home"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/15 shadow-[0_10px_24px_-20px_rgba(34,197,94,0.55)]">
              <Logo className="h-9 w-9 text-primary" />
            </div>
            <div className="inline-flex min-w-0 flex-col">
              <span className="block whitespace-nowrap font-headline text-[1.55rem] font-bold leading-none tracking-[-0.02em] text-primary">
                Valley Farm Secrets
              </span>
              <span className="mt-1 grid w-full grid-cols-[1fr_auto_1fr_auto_1fr] items-center text-[0.6rem] font-semibold uppercase leading-none tracking-[0.12em] text-muted-foreground">
                <span className="text-left">Freshness</span>
                <span className="justify-self-center text-muted-foreground/70">•</span>
                <span className="text-center">Quality</span>
                <span className="justify-self-center text-muted-foreground/70">•</span>
                <span className="text-right">Convenience</span>
              </span>
            </div>
          </Link>

          <nav className="flex min-w-0 items-center justify-center rounded-[1.75rem] border border-border/60 bg-card/92 px-3 py-2 shadow-[0_20px_45px_-34px_rgba(17,24,39,0.42)]">
            <div className="grid w-full grid-cols-9 gap-1.5">
              {navLinks.map((link) => (
                <NavigationLinkItem key={link.href} link={link} variant="desktop" />
              ))}
            </div>
          </nav>

          <div className="flex items-center justify-end gap-3 rounded-2xl border border-border/60 bg-background/92 px-3 py-2 shadow-[0_14px_32px_-24px_rgba(17,24,39,0.35)]">
            <CurrencySwitcher />
            <div className="h-8 w-px bg-border/80" />
            <ModeToggle />
          </div>
        </div>

        <div className="flex h-16 items-center justify-between lg:hidden">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2"
            aria-label="Valley Farm Secrets Home"
          >
            <Logo className="h-8 w-8 text-primary" />
            <span className="font-headline text-xl font-bold leading-none text-primary sm:text-2xl">
              Valley Farm Secrets
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <CurrencySwitcher />
            </div>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full border-border/70 bg-background/90 shadow-sm">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full max-w-sm bg-background p-0"
              >
                <SheetTitle className="sr-only">Mobile Menu</SheetTitle>
                <div className="flex h-full flex-col">
                  <div className="flex flex-col gap-4 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <Link
                        href="/"
                        className="flex items-center gap-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Logo className="h-7 w-7 text-primary" />
                        <span className="font-headline text-xl font-bold text-primary">
                          Valley Farm Secrets
                        </span>
                      </Link>
                      <ModeToggle />
                    </div>
                    <CurrencySwitcher className="w-fit" />
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
      </div>
    </header>
  );
}

type NavigationLinkItemProps = {
  link: NavLinkConfig;
  variant: 'desktop' | 'mobile';
  onNavigate?: () => void;
};

function NavigationLinkItem({
  link,
  variant,
  onNavigate,
}: NavigationLinkItemProps) {
  const Icon = link.icon;
  const toneClass = toneClassMap[link.tone];

  if (variant === 'desktop') {
    return (
      <Link
        href={link.href}
        onClick={onNavigate ? () => onNavigate() : undefined}
        className={cn(
          'group flex min-w-0 flex-col items-center gap-2 rounded-2xl px-2 py-2.5 text-center transition-all duration-200 hover:bg-primary/[0.06] hover:shadow-[0_12px_24px_-20px_rgba(17,24,39,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2'
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/80 ring-1 ring-border/60 transition-all duration-200 group-hover:bg-background group-hover:ring-primary/20">
          <Icon
            aria-hidden="true"
            className={cn(
              'h-[1.15rem] w-[1.15rem]',
              toneClass,
              'transition-colors group-hover:text-primary group-focus-visible:text-primary'
            )}
          />
        </span>
        <span
          className={cn(
            toneClass,
            'line-clamp-2 min-h-[2rem] text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.08em] transition-colors group-hover:text-primary group-focus-visible:text-primary'
          )}
        >
          {link.label}
        </span>
      </Link>
    );
  }

  // Mobile variant remains the same
  return (
    <Link
      href={link.href}
      onClick={onNavigate ? () => onNavigate() : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2'
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'h-5 w-5',
          toneClass,
          'transition-colors group-hover:text-primary group-focus-visible:text-primary'
        )}
      />
      <span
        className={cn(
          toneClass,
          'transition-colors group-hover:text-primary group-focus-visible:text-primary'
        )}
      >
        {link.label}
      </span>
    </Link>
  );
}
