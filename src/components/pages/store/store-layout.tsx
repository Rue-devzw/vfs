"use client";

import React from "react";
import Link from "next/link";
import { products, categories, Category } from "@/app/store/data";
import ProductFilters from "./product-filters";
import ProductGrid from "./product-grid";
import ProductCard from "./product-card";
import { ShoppingCart } from "./shopping-cart";
import { ServicesOverview, WholesaleSection, SourcingSection, CorporateAccountsSection, DigitalComingSoonSection, AccountSupportSection, StoreContactSection } from "./service-sections";
import { QuickOrderForm } from "./quick-order-form";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type LucideIcon, ChevronRight, Search, Sparkles, Truck, ShoppingBag, Building2, Zap, Salad, CheckCircle2 } from "lucide-react";

export type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

type HeroSlide = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  highlight: string;
  gradient: string;
  icon: LucideIcon;
};

const heroSlides: HeroSlide[] = [
  {
    title: "Wholesale supply without the stress",
    description: "Schedule recurring deliveries for schools, hospitality and NGOs with refrigerated logistics and account support.",
    ctaLabel: "Explore wholesale",
    ctaHref: "#wholesale",
    highlight: "Business essentials",
    gradient: "from-primary/20 via-primary/10 to-orange-200/30",
    icon: Truck,
  },
  {
    title: "Convenience veggies, ready for the wok",
    description: "Chopped, graded and portion-packed produce for chefs and busy kitchens. Order once, repeat easily.",
    ctaLabel: "Shop pre-packed veg",
    ctaHref: "#shop-prepack",
    highlight: "Kitchen ready",
    gradient: "from-emerald-200/40 via-primary/10 to-primary/5",
    icon: Salad,
  },
  {
    title: "Digital coming soon",
    description: "Sign up for Valley Farm Digital updates covering smart kitchenware, office solutions and electronics deals.",
    ctaLabel: "Join the waitlist",
    ctaHref: "#digital",
    highlight: "Future-ready",
    gradient: "from-indigo-200/40 via-primary/10 to-orange-200/30",
    icon: Sparkles,
  },
];

const trendingSearches = [
  "Bulk combos",
  "Chopped stir fry",
  "Pastel invoicing",
  "Valley Farm Digital",
  "Corporate accounts",
];

const categoryMenuItems = ["All", ...categories] as (Category | "All")[];

const serviceCards: Array<{
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    title: "Wholesale clients",
    description: "Dedicated logistics, curated produce lists and downloadable bulk price guides.",
    cta: "Go to wholesale hub",
    href: "#wholesale",
    icon: Truck,
  },
  {
    title: "Sourcing desk",
    description: "Let us find rare or seasonal produce and negotiate the best possible supply pricing.",
    cta: "Request sourcing",
    href: "#sourcing",
    icon: ShoppingBag,
  },
  {
    title: "Corporate accounts",
    description: "VAT-compliant invoices, Pastel integration and centralised purchasing for teams.",
    cta: "Apply for billing",
    href: "#corporate",
    icon: Building2,
  },
];

export function StoreLayout() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showSpecialsOnly, setShowSpecialsOnly] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<Category | "All">("All");
  const [sortOption, setSortOption] = React.useState<SortOption>("name-asc");

  const priceBounds = React.useMemo(() => {
    const priceList = products.map(product => product.price);
    const min = Math.min(...priceList);
    const max = Math.max(...priceList);
    return [Math.floor(min), Math.ceil(max + 1)] as [number, number];
  }, []);

  const [priceRange, setPriceRange] = React.useState<[number, number]>(priceBounds);
  const specialOffers = React.useMemo(() => products.filter(p => p.onSpecial), []);
  const scrollToProducts = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const target = document.getElementById("products-feed");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleCategorySelect = React.useCallback((category: Category | "All") => {
    setSelectedCategory(category);
    setShowSpecialsOnly(false);
    scrollToProducts();
  }, [scrollToProducts]);

  const handleTrendingClick = React.useCallback((term: string) => {
    setSearchTerm(term);
    setShowSpecialsOnly(false);
    scrollToProducts();
  }, [scrollToProducts]);

  const handleShowDeals = React.useCallback(() => {
    setShowSpecialsOnly(true);
    scrollToProducts();
  }, [scrollToProducts]);

  const filteredAndSortedProducts = React.useMemo(() => {
    let filtered = [...products];

    if (showSpecialsOnly) {
      filtered = filtered.filter(p => p.onSpecial);
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    filtered = filtered.filter(product => product.price >= priceRange[0] && product.price <= priceRange[1]);

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
  }, [searchTerm, showSpecialsOnly, selectedCategory, sortOption, priceRange]);

  const hasActiveFilter = Boolean(searchTerm) || showSpecialsOnly || selectedCategory !== "All" || priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1];

  const handleResetFilters = React.useCallback(() => {
    setSearchTerm("");
    setShowSpecialsOnly(false);
    setSelectedCategory("All");
    setPriceRange(priceBounds);
  }, [priceBounds]);

  const handleHeroSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    scrollToProducts();
  };

  return (
    <div className="bg-background">
      <ShoppingCart />
      <section className="border-b bg-gradient-to-br from-primary/10 via-background to-primary/5 py-10">
        <div className="container mx-auto space-y-6 px-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <Badge className="bg-primary text-primary-foreground">Marketplace 2.0</Badge>
              <span>AliExpress-inspired browsing for Valley Farm Secrets shoppers.</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Same-day dispatch in Harare • Business-friendly billing</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[240px_1fr_280px]">
            <aside className="hidden lg:block rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shop by category</p>
              <Separator className="my-3" />
              <ul className="space-y-1 text-sm">
                {categoryMenuItems.map(category => (
                  <li key={category}>
                    <button
                      type="button"
                      onClick={() => handleCategorySelect(category)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 transition hover:bg-muted/70 ${selectedCategory === category ? "bg-primary text-primary-foreground shadow" : "text-foreground"}`}
                    >
                      <span>{category === "All" ? "All departments" : category}</span>
                      <ChevronRight className="h-4 w-4 opacity-70" />
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            <div className="space-y-4">
              <form className="relative flex items-center gap-2 rounded-full border bg-background/90 px-4 py-3 shadow-sm" onSubmit={handleHeroSubmit} role="search">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search fresh produce, butchery, services..."
                  className="flex-1 border-0 bg-transparent p-0 text-base focus-visible:ring-0"
                  aria-label="Search the Valley Farm Secrets store"
                />
                <Button type="submit" size="sm" className="rounded-full px-4">Search</Button>
                <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={handleResetFilters}>
                  Clear
                </Button>
              </form>

              <div className="overflow-hidden rounded-3xl border bg-background/80 shadow-lg">
                <Carousel opts={{ align: "start", loop: true }}>
                  <CarouselContent>
                    {heroSlides.map((slide) => {
                      const Icon = slide.icon;
                      return (
                        <CarouselItem key={slide.title} className="p-6">
                          <div className={`relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-2xl border bg-gradient-to-br ${slide.gradient} p-6`}> 
                            <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-primary">
                              <Icon className="h-5 w-5" />
                              <span>{slide.highlight}</span>
                            </div>
                            <div className="space-y-3">
                              <h2 className="font-headline text-3xl font-bold leading-tight md:text-4xl">{slide.title}</h2>
                              <p className="max-w-2xl text-base text-muted-foreground">{slide.description}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <Button asChild>
                                <Link href={slide.ctaHref}>{slide.ctaLabel}</Link>
                              </Button>
                              <Button variant="outline" onClick={scrollToProducts}>Browse catalogue</Button>
                            </div>
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious className="-left-3 hidden h-10 w-10 translate-x-0 rounded-full bg-background/90 shadow-md lg:flex" />
                  <CarouselNext className="-right-3 hidden h-10 w-10 translate-x-0 rounded-full bg-background/90 shadow-md lg:flex" />
                </Carousel>
              </div>

              <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trending searches</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {trendingSearches.map(trend => (
                    <Button
                      key={trend}
                      variant="secondary"
                      size="sm"
                      className="rounded-full"
                      onClick={() => handleTrendingClick(trend)}
                    >
                      {trend}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {serviceCards.map(card => {
                const Icon = card.icon;
                return (
                  <Card key={card.title} className="overflow-hidden border-none bg-background/90 shadow-lg">
                    <CardHeader className="space-y-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5 text-primary" />
                        {card.title}
                      </CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full rounded-full">
                        <Link href={card.href}>{card.cta}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="flash-deals" className="container mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <Zap className="h-4 w-4" />
              <span>Flash deals</span>
            </div>
            <h2 className="font-headline text-3xl font-bold">Limited time specials</h2>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleShowDeals}>
              View all specials
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="#services">Business services</Link>
            </Button>
          </div>
        </div>
        <div className="mt-6 rounded-3xl border bg-background/80 p-4 shadow-sm">
          <Carousel opts={{ align: "start", loop: true }} className="w-full">
            <CarouselContent>
              {specialOffers.map(product => (
                <CarouselItem key={product.id} className="basis-3/4 p-2 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <ProductCard product={product} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4 hidden h-10 w-10 translate-x-0 rounded-full bg-background/90 shadow-md lg:flex" />
            <CarouselNext className="-right-4 hidden h-10 w-10 translate-x-0 rounded-full bg-background/90 shadow-md lg:flex" />
          </Carousel>
        </div>
      </section>

      <section id="products-feed" className="container mx-auto px-4 md:px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-6">
            <ProductFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              showSpecialsOnly={showSpecialsOnly}
              setShowSpecialsOnly={setShowSpecialsOnly}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categories={categories}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              priceBounds={priceBounds}
              onResetFilters={handleResetFilters}
              products={products}
            />
            <Card className="hidden lg:block border-none bg-primary/5 p-6 shadow-sm">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Why shoppers love Valley Farm
              </CardTitle>
              <CardContent className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>Bulk-friendly pricing across fresh produce, butchery cuts and pantry staples.</p>
                <p>Service desks for sourcing, invoicing and digital expansion all in one marketplace.</p>
                <p>Responsive support with WhatsApp, email and downloadable catalogues.</p>
              </CardContent>
            </Card>
          </aside>
          <div className="space-y-6">
            <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">All products & services</p>
                  <h2 className="font-headline text-3xl font-bold">Discover everything fresh</h2>
                  <p className="text-sm text-muted-foreground">Filter by department, specials or price just like a global marketplace.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button size="sm" variant={showSpecialsOnly ? "outline" : "default"} onClick={() => setShowSpecialsOnly(false)}>
                    Show all
                  </Button>
                  <Button size="sm" variant={showSpecialsOnly ? "default" : "outline"} onClick={handleShowDeals}>
                    Specials only
                  </Button>
                </div>
              </div>
            </div>
            <ProductGrid
              products={filteredAndSortedProducts}
              sortOption={sortOption}
              setSortOption={setSortOption}
              hasActiveFilter={hasActiveFilter}
              categories={categories}
              allProducts={products}
            />
          </div>
        </div>
      </section>

      <section id="batch-order" className="border-y bg-muted/30 py-16">
        <div className="container mx-auto grid gap-10 px-4 md:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div className="space-y-5">
            <Badge className="bg-primary/10 text-primary">Batch ordering concierge</Badge>
            <h2 className="font-headline text-3xl font-bold">Send us your full order list</h2>
            <p className="text-lg text-muted-foreground">
              Upload complex shopping lists or standing orders and our sales desk will build a quote, confirm availability and schedule deliveries.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />Priority handling for schools, restaurants and caterers.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />Track repeat orders and delivery dates with account managers.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />WhatsApp or email confirmation within one business day.</li>
            </ul>
          </div>
          <QuickOrderForm />
        </div>
      </section>

      <ServicesOverview />
      <WholesaleSection />
      <SourcingSection />
      <CorporateAccountsSection />
      <DigitalComingSoonSection />
      <AccountSupportSection />
      <StoreContactSection />
    </div>
  );
}
