"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Category, Product } from '@/app/store/data';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showSpecialsOnly: boolean;
  setShowSpecialsOnly: (show: boolean) => void;
  selectedCategory: Category | "All";
  setSelectedCategory: (category: Category | "All") => void;
  categories: readonly Category[];
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  priceBounds: [number, number];
  onResetFilters: () => void;
  products: Product[];
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  showSpecialsOnly,
  setShowSpecialsOnly,
  selectedCategory,
  setSelectedCategory,
  categories,
  priceRange,
  setPriceRange,
  priceBounds,
  onResetFilters,
  products,
}) => {
  const suggestions = React.useMemo(() => {
    if (!searchTerm) return [] as Product[];
    return products
      .filter(product => product.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 5);
  }, [products, searchTerm]);

  const hasActiveFilters = React.useMemo(() => {
    return (
      Boolean(searchTerm) ||
      showSpecialsOnly ||
      selectedCategory !== "All" ||
      priceRange[0] !== priceBounds[0] ||
      priceRange[1] !== priceBounds[1]
    );
  }, [priceBounds, priceRange, searchTerm, selectedCategory, showSpecialsOnly]);

  const handleSliderChange = (values: number[]) => {
    const [min, max] = values;
    setPriceRange([min, max]);
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="search">Search Products</Label>
          <Input
            id="search"
            placeholder="e.g., Apples, Steak..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {suggestions.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground" aria-live="polite">
              {suggestions.map(product => (
                <li key={product.id}>
                  <button
                    type="button"
                    className="w-full text-left hover:text-primary"
                    onClick={() => setSearchTerm(product.name)}
                  >
                    {product.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
          <Label htmlFor="special-offers">Show Special Offers Only</Label>
          <Switch
            id="special-offers"
            checked={showSpecialsOnly}
            onCheckedChange={setShowSpecialsOnly}
          />
        </div>

        <div>
          <Label>Price Range (${priceRange[0].toFixed(2)} - ${priceRange[1].toFixed(2)})</Label>
          <Slider
            min={priceBounds[0]}
            max={priceBounds[1]}
            step={0.5}
            value={priceRange}
            onValueChange={handleSliderChange}
            className="mt-4"
            aria-label="Filter by price range"
          />
        </div>

        <div>
          <Label>Category</Label>
          <RadioGroup
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as Category | "All")}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="All" id="cat-all" />
              <Label htmlFor="cat-all">All</Label>
            </div>
            {categories.map(category => (
              <div key={category} className="flex items-center space-x-2">
                <RadioGroupItem value={category} id={`cat-${category}`} />
                <Label htmlFor={`cat-${category}`}>{category}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {hasActiveFilters && (
          <div className="space-y-2">
            <Label>Active Filters</Label>
            <div className="flex flex-wrap gap-2">
              {searchTerm && <Badge variant="secondary">Search: {searchTerm}</Badge>}
              {showSpecialsOnly && <Badge variant="secondary">Special Offers</Badge>}
              {selectedCategory !== "All" && <Badge variant="secondary">{selectedCategory}</Badge>}
              {(priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1]) && (
                <Badge variant="secondary">${priceRange[0].toFixed(0)} - ${priceRange[1].toFixed(0)}</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onResetFilters}>Clear filters</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductFilters;
