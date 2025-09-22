"use client";

import Image from "next/image";
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
import {
  Carrot,
  Beef,
  ShoppingBasket,
  Sparkle,
  Zap,
} from "lucide-react";
import { useState, useMemo, useCallback, useRef } from "react"; 

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
      // This object was incomplete in your provided code, you might need to fill it
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
    </div>
  );
}
