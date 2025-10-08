"use client";

import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Product } from '@/app/store/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCart } from './cart-context';
import { ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { dispatch } = useCart();
  const { toast } = useToast();
  const image = PlaceHolderImages.find(p => p.id === product.image) || PlaceHolderImages.find(p => p.id === 'product-apples');
  const hasCashPrice = typeof product.cashPrice === 'number' && product.cashPrice !== product.price;
  const formattedOnlinePrice = `$${product.price.toFixed(2)}`;
  const formattedCashPrice = hasCashPrice && product.cashPrice !== undefined ? `$${product.cashPrice.toFixed(2)}` : null;

  const handleAddToCart = () => {
    dispatch({ type: 'ADD_ITEM', payload: product });
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden transform transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl">
      <CardHeader className="p-0 relative">
        {image && (
          <Image
            src={image.imageUrl}
            alt={product.name}
            width={400}
            height={300}
            className="w-full h-auto aspect-4/3 object-cover"
            data-ai-hint={image.imageHint}
          />
        )}
        {product.onSpecial && (
          <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 text-xs font-bold rounded-md">
            SPECIAL
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="font-headline text-lg mb-2">{product.name}</CardTitle>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Online</span>
            <p className="text-xl font-bold text-primary">{formattedOnlinePrice}</p>
            {product.onSpecial && product.oldPrice && (
              <p className="text-sm text-muted-foreground line-through">${product.oldPrice.toFixed(2)}</p>
            )}
            <p className="text-sm text-muted-foreground">{product.unit}</p>
          </div>
          {formattedCashPrice && (
            <div className="flex items-baseline gap-2 text-sm text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wide">Cash</span>
              <span className="font-semibold text-foreground">{formattedCashPrice}</span>
              <span className="text-xs">in-store</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAddToCart}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
