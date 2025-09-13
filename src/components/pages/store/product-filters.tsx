"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Category } from '@/app/store/data';

interface ProductFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showSpecialsOnly: boolean;
  setShowSpecialsOnly: (show: boolean) => void;
  selectedCategory: Category | "All";
  setSelectedCategory: (category: Category | "All") => void;
  categories: readonly Category[];
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  showSpecialsOnly,
  setShowSpecialsOnly,
  selectedCategory,
  setSelectedCategory,
  categories,
}) => {
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
      </CardContent>
    </Card>
  );
};

export default ProductFilters;
