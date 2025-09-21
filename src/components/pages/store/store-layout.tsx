"use client";

import Image from "next/image";
import React, { useMemo, useRef, useState, useCallback } from "react";
import { products, categories, Category } from "@/app/store/data";
import ProductFilters from "./product-filters";
import ProductGrid from "./product-grid";
import { ShoppingCart } from "./shopping-cart";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import ProductCard from "./product-card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { services } from "@/lib/data";
import {
  type LucideIcon,
  Carrot,
  Beef,
  ShoppingBasket,
  Sparkle,
  Zap,
  Truck,
  Clock,
} from "lucide-react";

export type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

type HeroSlide = {
  imageId: string;
  title: string;
  description: string;
  highlight: string;
  category: Category;
  cta: string;
};

type QuickTile = {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  footer?: string;
};

const categoryIcons: Record<Category, LucideIcon> = {
  "Fruit & Veg": Carrot,
  "Butchery": Beef,
  "Grocery & Spices": ShoppingBasket,
};

export function StoreLayout() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSpecialsOnly, setShowSpecialsOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const productSectionRef = useRef<HTMLDivElement | null>(null);

  const specialOffers = useMemo(() => products.filter(product => product.onSpecial), []);

  const heroSlides = useMemo(() => {
    const slides: HeroSlide[] = [
      {
        imageId: "hero-produce",
        title: "Fresh Market Arrivals",
        description: "Hand-picked vegetables, crisp greens, and seasonal fruits landing in store daily.",
        highlight: "Up to 25% off farm-fresh staples",
        category: "Fruit & Veg",
        cta: "Shop fresh produce",
      },
      {
        imageId: "gallery-2",
        title: "Master Butchery Cuts",
        description: "Premium beef, lamb, chicken, and braai packs prepared by our in-house butchers.",
        highlight: "Bundle deals for the weekend braai",
        category: "Butchery",
        cta: "Explore the butchery",
      },
      {
        imageId: "gallery-4",
        title: "Pantry & Spice World",
        description: "Stock your shelves with Valley Farm Secrets groceries, spice blends, and everyday essentials.",
        highlight: "Wholesale-ready pack sizes",
        category: "Grocery & Spices",
        cta: "Browse groceries",
      },
    ];

    return slides.map(slide => ({
      ...slide,
      image: PlaceHolderImages.find(image => image.id === slide.imageId) ?? null,
    }));
  }, []);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    if (showSpecialsOnly) {
      filtered = filtered.filter(product => product.onSpecial);
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return filtered.sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        default:
          return 0;
      }
    });
  }, [searchTerm, showSpecialsOnly, selectedCategory, sortOption]);

  const hasActiveFilter = Boolean(searchTerm) || showSpecialsOnly || selectedCategory !== "All";

  const handleCategorySelect = useCallback((category: Category | "All") => {
    setSelectedCategory(category);
    setShowSpecialsOnly(false);
    productSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleViewSpecials = useCallback(() => {
    setShowSpecialsOnly(true);
    productSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const highlightServices = services.filter(service =>
    [
      "Fruit & Vegetables",
      "Butchery",
      "Grocery & Spices",
      "Wholesale Supply",
    ].includes(service.title),
  );

  const quickTiles: QuickTile[] = [
    {
      title: "Flash Deals",
      description: "Limited-time savings refreshed weekly across all departments.",
      icon: Zap,
      action: {
        label: "View specials",
        onClick: handleViewSpecials,
      },
    },
    {
      title: "Wholesale Desk",
      description: "Bulk pricing, deliveries, and standing orders for institutions & restaurants.",
      icon: Truck,
      action: {
        label: "Call +263 788 679 000",
        href: "tel:+263788679000",
      },
    },
    {
      title: "Store Hours",
      description: "Mon-Sat: 8:00 AM - 7:00 PM",
      icon: Clock,
      footer: "Visit us at 75 Main Street, Gweru.",
    },
  ];

  return (
    <div className="bg-muted/10 pb-16">
      <ShoppingCart />

      <section className="border-b bg-gradient-to-br from-primary/10 via-background to-background py-10 lg:py-14">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_280px] xl:grid-cols-[260px_minmax(0,1fr)_320px]">
            <aside className="hidden h-full rounded-2xl border bg-card/70 backdrop-blur lg:block">
              <div className="border-b px-6 py-5">
                <h3 className="font-headline text-lg font-semibold">Shop by Department</h3>
                <p className="mt-1 text-sm text-muted-foreground">Browse categories just like the store aisles.</p>
              </div>
              <nav className="flex flex-col divide-y">
                <button
                  type="button"
                  onClick={() => handleCategorySelect("All")}
                  className={`flex items-center gap-3 px-6 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/60 ${selectedCategory === "All" ? "bg-primary text-primary-foreground" : "text-foreground"}`}
                >
                  <Sparkle className="h-4 w-4" />
                  View everything
                </button>
                {categories.map(category => {
                  const Icon = categoryIcons[category];
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategorySelect(category)}
                      className={`flex items-center gap-3 px-6 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/60 ${isActive ? "bg-primary text-primary-foreground" : "text-foreground"}`}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {category}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <div className="space-y-5">
              <div className="lg:hidden">
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {["All", ...categories].map(category => {
                    const isActive = selectedCategory === category;
                    return (
                      <Button
                        key={category}
                        size="sm"
                        variant={isActive ? "default" : "outline"}
                        className="whitespace-nowrap"
                        onClick={() => handleCategorySelect(category as Category | "All")}
                      >
                        {category}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Carousel opts={{ loop: true }} className="overflow-hidden rounded-2xl">
                <CarouselContent>
                  {heroSlides.map(slide => (
                    <CarouselItem key={slide.imageId}>
                      <div className="relative h-[260px] overflow-hidden rounded-2xl bg-muted sm:h-[320px] lg:h-[360px]">
                        {slide.image && (
                          <Image
                            src={slide.image.imageUrl}
                            alt={slide.image.description}
                            fill
                            className="object-cover"
                            priority
                            sizes="(min-width: 1280px) 960px, (min-width: 768px) 70vw, 90vw"
                            data-ai-hint={slide.image.imageHint}
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/10" />
                        <div className="relative z-10 flex h-full flex-col justify-center gap-4 px-7 py-8 sm:px-10">
                          <Badge className="w-fit bg-primary text-primary-foreground shadow">{slide.highlight}</Badge>
                          <h2 className="font-headline text-3xl font-bold text-foreground sm:text-4xl">{slide.title}</h2>
                          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">{slide.description}</p>
                          <div className="flex flex-wrap items-center gap-3">
                            <Button size="lg" onClick={() => handleCategorySelect(slide.category)}>
                              {slide.cta}
                            </Button>
                            <Button variant="outline" size="lg" onClick={handleViewSpecials}>
                              See specials
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-background/90 shadow lg:flex" />
                <CarouselNext className="right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-background/90 shadow lg:flex" />
              </Carousel>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {highlightServices.map(service => (
                  <Card key={service.title} className="border-none bg-card/80 shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3 pb-2">
                      <div className="rounded-full bg-primary/10 p-3 text-primary">
                        <service.icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base font-semibold">{service.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground">{service.description}</CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="hidden flex-col gap-4 lg:flex">
              {quickTiles.map(tile => (
                <Card key={tile.title} className="h-full border border-border/60 bg-card/80 shadow-sm">
                  <CardHeader className="flex flex-row items-center gap-3 pb-3">
                    <div className="rounded-full bg-primary/10 p-3 text-primary">
                      <tile.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base font-semibold">{tile.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
                    <p>{tile.description}</p>
                    {tile.action ? (
                      tile.action.href ? (
                        <Button size="sm" variant="outline" asChild>
                          <a href={tile.action.href} onClick={tile.action.onClick}>
                            {tile.action.label}
                          </a>
                        </Button>
                      ) : tile.action.onClick ? (
                        <Button size="sm" onClick={tile.action.onClick}>
                          {tile.action.label}
                        </Button>
                      ) : (
                        <p className="text-sm font-medium text-primary">{tile.action.label}</p>
                      )
                    ) : tile.footer ? (
                      <p className="text-sm font-medium text-primary">{tile.footer}</p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-12 pt-10 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl font-bold md:text-3xl">Flash Deals</h2>
            <p className="text-muted-foreground">Catch the latest promotions before they sell out.</p>
          </div>
          <Button variant="ghost" onClick={handleViewSpecials}>
            Shop all specials
          </Button>
        </div>
        <div className="mt-6">
          {specialOffers.length > 0 ? (
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent>
                {specialOffers.map(product => (
                  <CarouselItem key={product.id} className="sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <div className="p-1">
                      <ProductCard product={product} />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-background/90 shadow md:flex" />
              <CarouselNext className="right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-background/90 shadow md:flex" />
            </Carousel>
          ) : (
            <p className="rounded-lg border bg-card/60 p-8 text-center text-muted-foreground">
              New deals are loading — check back soon!
            </p>
          )}
        </div>
      </section>

      <section className="bg-card/40 py-14">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-headline text-3xl font-bold md:text-4xl">In-Store Services & Departments</h2>
            <p className="mt-3 text-base text-muted-foreground">
              Everything you can access when you walk through our doors — from retail counters to wholesale support and corporate servicing.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {services.map(service => (
              <Card key={service.title} className="h-full border-none bg-background/90 shadow-sm">
                <CardHeader className="flex flex-col items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <service.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg font-semibold">{service.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">{service.description}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section ref={productSectionRef} id="store-products" className="container mx-auto px-4 pb-16 pt-12 md:px-6">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="order-2 space-y-6 lg:order-1">
            <ProductFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              showSpecialsOnly={showSpecialsOnly}
              setShowSpecialsOnly={setShowSpecialsOnly}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categories={categories}
            />
          </div>

          <div className="order-1 lg:order-2">
            <ProductGrid
              products={filteredAndSortedProducts}
              sortOption={sortOption}
              setSortOption={setSortOption}
              hasActiveFilter={hasActiveFilter}
              categories={categories}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
