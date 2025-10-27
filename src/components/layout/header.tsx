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
        'sticky top-0 z-50 w-full transition-all duration-300',
        isScrolled
          ? 'bg-background/80 backdrop-blur-sm shadow-md'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Valley Farm Secrets Home"
        >
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-headline text-2xl font-bold text-primary">
            Valley Farm Secrets
          </span>
        </Link>
        <nav className="hidden items-center gap-4 md:flex">
          {navLinks.map((link) => (
            <NavigationLinkItem key={link.href} link={link} variant="desktop" />
          ))}
        </nav>
        <div className="flex items-center gap-4">
        <div className='hidden md:block'>
        <ModeToggle />
        </div>
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
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
                <div className="p-6 flex justify-between">
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
          'group flex flex-col items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2'
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            'h-6 w-6',
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

  // Mobile variant remains the same
  return (
    <Link
      href={link.href}
      onClick={onNavigate ? () => onNavigate() : undefined}
      className={cn(
        'group flex items-center gap-2 rounded-md px-3 py-2 text-lg font-semibold transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2'
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
