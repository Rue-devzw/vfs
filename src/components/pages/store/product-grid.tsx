"use client";

import React from 'react';
import { Product, Category } from '@/app/store/data';
import ProductCard from './product-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortOption } from './store-layout';

interface ProductGridProps {
  products: Product[];
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  hasActiveFilter: boolean;
  categories: readonly Category[];
  allProducts: Product[];
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  sortOption,
  setSortOption,
  hasActiveFilter,
  categories,
  allProducts,
}) => {
  const relatedProducts = React.useMemo(() => {
    if (!hasActiveFilter || products.length === 0) return [] as Product[];
    const seen = new Set(products.map(product => product.id));
    return allProducts.filter(product => !seen.has(product.id)).slice(0, 3);
  }, [allProducts, hasActiveFilter, products]);

  const anchorForCategory = (category: string) => {
    if (category === 'Pre-Packed & Prepared Veg') {
      return 'shop-prepack';
    }
    return `shop-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="price-asc">Price (Low-High)</SelectItem>
            <SelectItem value="price-desc">Price (High-Low)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilter ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.length > 0 ? (
            products.map(product => <ProductCard key={product.id} product={product} />)
          ) : (
            <p className="col-span-full text-center text-muted-foreground">No products match your filters.</p>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {categories.map(category => {
            const categoryProducts = products.filter(p => p.category === category);
            if (categoryProducts.length === 0) return null;
            return (
              <section key={category} id={anchorForCategory(category)}>
                <h3 className="font-headline text-2xl font-bold mb-4 border-b pb-2">{category}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {categoryProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
      {relatedProducts.length > 0 && (
        <section className="mt-12 rounded-2xl border bg-background p-6 shadow-sm">
          <h3 className="font-headline text-xl font-semibold mb-4">Customers also consider</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {relatedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductGrid;
