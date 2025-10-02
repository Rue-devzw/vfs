"use client";

import React, { useMemo, useRef, useState, useCallback } from "react";
import { products, categories, Category } from "@/app/store/data";
import ProductFilters from "./product-filters";
import ProductGrid from "./product-grid";
import { ShoppingCart } from "./shopping-cart";
import ProductCard from "./product-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type LucideIcon, Carrot, Beef, ShoppingBasket, Sparkle } from "lucide-react";

export type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

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

  const scrollToProducts = useCallback(() => {
    productSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    scrollToProducts();
  }, [scrollToProducts]);

  const handleViewSpecials = useCallback(() => {
    setShowSpecialsOnly(true);
    scrollToProducts();
  }, [scrollToProducts]);

  const handleViewAllProducts = useCallback(() => {
    setSelectedCategory("All");
    setShowSpecialsOnly(false);
    scrollToProducts();
  }, [scrollToProducts]);

  return (
    <div className="bg-muted/10 pb-16">
      <ShoppingCart />

      <section className="border-b bg-background py-10 lg:py-14">
        <div className="container mx-auto grid gap-10 px-4 md:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="hidden rounded-2xl border bg-card/70 p-6 lg:block">
            <h3 className="font-headline text-lg font-semibold">Shop by Department</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Jump straight to the products you need.
            </p>
            <nav className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleViewAllProducts}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted ${
                  selectedCategory === "All" ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}
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
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted ${
                      isActive ? "bg-primary text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {category}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-8">
            <div className="rounded-2xl border bg-card/80 p-8 shadow-sm">
              <Badge className="mb-4 w-fit bg-primary text-primary-foreground">Welcome in-store</Badge>
              <h1 className="font-headline text-3xl font-bold md:text-4xl">Shop Valley Farm Secrets</h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
                Browse departments, filter by specials, and load your cart in a few clicks. Everything here is set up to get you
                shopping fast.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={handleViewAllProducts}>
                  Start shopping
                </Button>
                <Button size="lg" variant="outline" onClick={handleViewSpecials}>
                  View specials
                </Button>
              </div>
            </div>

            <div className="lg:hidden">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Departments</h2>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
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

            <Card className="border-none bg-card/80 shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <Sparkle className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Ready for checkout</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                Use the filters below, add your favourites to the cart, and pick up in store. No fluff—just the essentials.
              </CardContent>
            </Card>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {specialOffers.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border bg-card/60 p-8 text-center text-muted-foreground">
              New deals are loading — check back soon!
            </p>
          )}
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
