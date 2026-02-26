"use client";

import Image from "next/image";
import React, { useMemo, useRef, useState, useCallback } from "react";
import { categories, Category, Product } from "@/app/store/data";
import { listProducts } from "@/lib/firestore/products";
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
import { useRouter } from "next/navigation";
import Autoplay from "embla-carousel-autoplay";
import ProductCard from "./product-card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { services } from "@/lib/data";
import {
  type LucideIcon,
  Baby,
  Beef,
  Carrot,
  ChefHat,
  CupSoda,
  Droplets,
  Leaf,
  Milk,
  PackageOpen,
  Salad,
  ShoppingBasket,
  ShowerHead,
  Sparkle,
  Sparkles,
  SprayCan,
  Wheat,
  Zap,
} from "lucide-react";

export type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

type HeroSlide = {
  imageId: string;
  title: string;
  description: string;
  highlight: string;
  category: Category;
  cta: string;
  href?: string;
};



const categoryIcons: Record<Category, LucideIcon> = {
  "Fruit & Veg": Carrot,
  "Butchery": Beef,
  "Grocery & Spices": ShoppingBasket,
  "Baby": Baby,
  "Cleaning Products": SprayCan,
  "Cosmetics": Sparkles,
  "Toiletries": ShowerHead,
  "Beverages": CupSoda,
  "Cereals": Wheat,
  "Dairy": Milk,
  "Dried": Leaf,
  "Oils & Sauces": Droplets,
  "Other Items": PackageOpen,
  "Salad Dressing": Salad,
  "Seasoning": ChefHat,
};

export function StoreLayout() {
  const router = useRouter();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSpecialsOnly, setShowSpecialsOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const productSectionRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await listProducts({});
        setAllProducts(data.items as unknown as Product[]);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setAllProducts([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);


  const specialOffers = useMemo(() => allProducts.filter(product => product.onSpecial), [allProducts]);

  const heroSlides = useMemo(() => {
    const slides: HeroSlide[] = [
      {
        imageId: "zesa",
        title: "Buy ZESA Tokens Instantly",
        description: "Top up your electricity meter in seconds. Safe, secure, and reliable.",
        highlight: "Powered by ZB Bank",
        category: "Other Items",
        cta: "Buy Token",
        href: "/store/zesa-tokens",
      },
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
    let filtered = [...allProducts];

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
  }, [allProducts, searchTerm, showSpecialsOnly, selectedCategory, sortOption]);

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





  return (
    <div className="bg-muted/10 pb-16">
      <ShoppingCart />

      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-background pb-10 lg:pb-14 pt-8">
        <div className="container mx-auto px-4 md:px-6">
          {/* Hero Grid: Carousel + ZESA Card */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <Carousel
              opts={{ loop: true }}
              plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
              className="overflow-hidden rounded-2xl shadow-xl"
            >
              <CarouselContent>
                {heroSlides.map((slide, index) => (
                  <CarouselItem key={slide.imageId}>
                    <div className="relative h-[300px] overflow-hidden rounded-2xl bg-muted sm:h-[360px] lg:h-[420px]">
                      {slide.image && (
                        <Image
                          src={slide.image.imageUrl}
                          alt={slide.image.description}
                          fill
                          className="object-cover"
                          priority={index === 0}
                          loading={index === 0 ? "eager" : "lazy"}
                          sizes="(min-width: 1024px) 800px, 100vw"
                          data-ai-hint={slide.image.imageHint}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/10" />
                      <div className="relative z-10 flex h-full flex-col justify-center gap-4 px-7 py-8 sm:px-10">
                        <Badge className="w-fit bg-primary text-primary-foreground shadow">{slide.highlight}</Badge>
                        <h2 className="font-headline text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">{slide.title}</h2>
                        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">{slide.description}</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            size="lg"
                            className="rounded-full px-8 shadow-lg transition-transform hover:scale-105"
                            onClick={() => {
                              if (slide.href) {
                                router.push(slide.href);
                              } else {
                                handleCategorySelect(slide.category);
                              }
                            }}
                          >
                            {slide.cta}
                          </Button>
                          <Button variant="outline" size="lg" className="rounded-full" onClick={handleViewSpecials}>
                            See specials
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full border-none bg-background/90 shadow-lg lg:flex" />
              <CarouselNext className="right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full border-none bg-background/90 shadow-lg lg:flex" />
            </Carousel>

            {/* ZESA Direct Card */}
            <Card className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border-none bg-[#fdf2f2] shadow-xl transition-all hover:shadow-2xl lg:h-[420px]">
              <div className="relative h-48 w-full overflow-hidden sm:h-56 lg:h-48">
                <Image
                  src="/images/Zesa.webp"
                  alt="ZESA Token"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#fdf2f2] to-transparent" />
              </div>
              <div className="relative z-10 flex flex-1 flex-col p-6 pt-0">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Zap className="h-5 w-5 fill-current" />
                  <span className="text-xs font-bold uppercase tracking-wider">Flash Utility</span>
                </div>
                <CardTitle className="font-headline text-2xl font-bold text-[#2d1515]">Buy ZESA Tokens</CardTitle>
                <p className="mt-2 text-sm text-[#5a3a3a]">
                  Instant electricity top-up via ZB Bank. Safe and available 24/7.
                </p>
                <div className="mt-auto pt-6">
                  <Button asChild className="w-full rounded-full bg-[#e31e24] font-bold text-white shadow-lg hover:bg-[#c1191f]">
                    <a href="/store/zesa-tokens">Buy Now</a>
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Horizontal Category Nav */}
          <div className="mt-10 lg:mt-14">
            <h3 className="mb-6 font-headline text-xl font-bold">Shop by Department</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar lg:grid lg:grid-cols-8 lg:gap-3 lg:overflow-visible">
              <button
                type="button"
                onClick={() => handleCategorySelect("All")}
                className={`flex min-w-[120px] flex-col items-center gap-3 rounded-2xl p-4 transition-all hover:shadow-md ${selectedCategory === "All" ? "bg-primary text-primary-foreground shadow-lg scale-105" : "bg-card border hover:border-primary/20"}`}
              >
                <div className={`rounded-full p-3 ${selectedCategory === "All" ? "bg-white/20" : "bg-primary/10 text-primary"}`}>
                  <Sparkle className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-center">Everything</span>
              </button>

              {categories.slice(0, 7).map(category => {
                const Icon = categoryIcons[category];
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategorySelect(category)}
                    className={`flex min-w-[120px] flex-col items-center gap-3 rounded-2xl p-4 transition-all hover:shadow-md ${isActive ? "bg-primary text-primary-foreground shadow-lg scale-105" : "bg-card border hover:border-primary/20"}`}
                  >
                    <div className={`rounded-full p-3 ${isActive ? "bg-white/20" : "bg-primary/10 text-primary"}`}>
                      {Icon && <Icon className="h-6 w-6" />}
                    </div>
                    <span className="text-xs font-bold text-center">{category}</span>
                  </button>
                );
              })}
            </div>
            {/* View all button for mobile if categories are many */}
            {categories.length > 7 && (
              <div className="mt-4 flex justify-center lg:hidden">
                <Button variant="ghost" size="sm" onClick={() => productSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                  View more categories below
                </Button>
              </div>
            )}
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
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : specialOffers.length > 0 ? (
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

      <section className="bg-card/40 py-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-headline text-3xl font-bold md:text-4xl">In-Store Services & Departments</h2>
            <p className="mt-3 text-base text-muted-foreground">
              Everything you can access when you walk through our doors — from retail counters to wholesale support and corporate servicing.
            </p>
            <Button onClick={() => setIsServicesExpanded(!isServicesExpanded)} variant="outline" className="mt-4">
              {isServicesExpanded ? 'Hide Services' : 'Show Services'}
            </Button>
          </div>
          {isServicesExpanded && (
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
          )}
        </div>
      </section>

      <section ref={productSectionRef} id="store-products" className="container mx-auto px-4 pb-16 pt-8 md:px-6">
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
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : (
              <ProductGrid
                products={filteredAndSortedProducts}
                sortOption={sortOption}
                setSortOption={setSortOption}
                hasActiveFilter={hasActiveFilter}
                categories={categories}
              />
            )}
          </div>
        </div>
      </section>
    </div >
  );
}
