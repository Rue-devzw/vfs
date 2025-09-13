"use client";

import React, { useState, useMemo } from 'react';
import { products, categories, Category } from '@/app/store/data';
import ProductFilters from './product-filters';
import ProductGrid from './product-grid';
import { ShoppingCart } from './shopping-cart';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ProductCard from './product-card';

export type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

export function StoreLayout() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSpecialsOnly, setShowSpecialsOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  
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

  const hasActiveFilter = searchTerm || showSpecialsOnly || selectedCategory !== "All";

  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      <ShoppingCart />
      {/* Special Offers Carousel */}
      <section className="mb-12">
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

      {/* Main Store Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <ProductFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showSpecialsOnly={showSpecialsOnly}
            setShowSpecialsOnly={setShowSpecialsOnly}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            categories={categories}
          />
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <ProductGrid
            products={filteredAndSortedProducts}
            sortOption={sortOption}
            setSortOption={setSortOption}
            hasActiveFilter={hasActiveFilter}
            categories={categories}
          />
        </div>
      </div>
    </div>
  );
}
