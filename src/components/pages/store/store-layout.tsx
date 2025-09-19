"use client";

import React, { useState, useMemo } from 'react';
import { products, categories, Category } from '@/app/store/data';
import ProductFilters from './product-filters';
import ProductGrid from './product-grid';
import { ShoppingCart } from './shopping-cart';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ProductCard from './product-card';
import { ServicesOverview, WholesaleSection, SourcingSection, CorporateAccountsSection, DigitalComingSoonSection, AccountSupportSection, StoreContactSection } from './service-sections';
import { QuickOrderForm } from './quick-order-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Search } from 'lucide-react';
import Link from 'next/link';

export type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

export function StoreLayout() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSpecialsOnly, setShowSpecialsOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");

  const priceBounds = useMemo(() => {
    const priceList = products.map(product => product.price);
    const min = Math.min(...priceList);
    const max = Math.max(...priceList);
    return [Math.floor(min), Math.ceil(max + 1)] as [number, number];
  }, []);
  const [priceRange, setPriceRange] = useState<[number, number]>(priceBounds);

  const specialOffers = useMemo(() => products.filter(p => p.onSpecial), []);

  const filteredAndSortedProducts = useMemo(() => {
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

  const handleResetFilters = () => {
    setSearchTerm("");
    setShowSpecialsOnly(false);
    setSelectedCategory("All");
    setPriceRange(priceBounds);
  };

  const handleHeroSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="bg-background">
      <ShoppingCart />
      <section id="shop" className="border-b bg-primary/5 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link className="hover:text-primary" href="/">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link className="hover:text-primary" href="/store">Online Store</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-foreground">Shop & Services</li>
            </ol>
          </nav>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <Badge className="bg-primary text-primary-foreground">Fresh • Reliable • Digital</Badge>
              <h1 className="mt-4 font-headline text-4xl font-bold md:text-5xl">Shop Valley Farm Secrets</h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Fresh produce, butchery cuts, pantry staples and business services in one connected experience. Search the catalogue below or share a batch order for concierge assistance.
              </p>
              <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleHeroSubmit} role="search">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search for fresh produce, meat or services"
                    className="pl-9"
                    aria-label="Search the Valley Farm Secrets store"
                  />
                </div>
                <Button type="submit" className="sm:w-32">Search</Button>
                <Button type="button" variant="ghost" onClick={handleResetFilters} className="sm:w-32">Clear</Button>
              </form>
              <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Same-day deliveries in Harare</span>
                <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Corporate invoicing ready</span>
                <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Pre-packed veg for busy kitchens</span>
              </div>
            </div>
            <QuickOrderForm />
          </div>
        </div>
      </section>

      <section id="special-offers" className="container mx-auto px-4 md:px-6 py-12">
        <h2 className="font-headline text-3xl font-bold mb-4">Special Offers</h2>
        <Carousel opts={{ align: "start", loop: true }} className="w-full">
          <CarouselContent>
            {specialOffers.map(product => (
              <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <div className="p-1">
                  <ProductCard product={product} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="ml-12" />
          <CarouselNext className="mr-12" />
        </Carousel>
      </section>

      <section className="container mx-auto px-4 md:px-6 pb-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
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
          </aside>
          <div className="lg:col-span-3">
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
