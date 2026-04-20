"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from '@/components/ui/sheet';
import { useCart, CartItem } from './cart-context';
import { ShoppingBag, Trash2, Plus, Minus } from 'lucide-react';
import Image from 'next/image';
import { findProductImagePlaceholder } from '@/lib/placeholder-images';
import { CheckoutDialog } from './checkout-dialog';
import { convertFromUsd, formatMoney } from '@/lib/currency';
import { useCurrency } from '@/components/currency/currency-provider';
import { CurrencySwitcher } from '@/components/currency/currency-switcher';

export function ShoppingCart() {
  const { state: { items }, dispatch } = useCart();
  const { currencyCode } = useCurrency();
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalUsd = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = convertFromUsd(subtotalUsd, currencyCode);

  const updateQuantity = (id: string | number, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const handleCheckout = () => {
    setCartOpen(false);
    setCheckoutOpen(true);
  }

  return (
    <>
      <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 z-50"
          >
            <ShoppingBag className="h-6 w-6" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                {totalItems}
              </span>
            )}
            <span className="sr-only">Open shopping cart</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-headline text-2xl">Your Cart</SheetTitle>
            <SheetDescription className="sr-only">
              Review the items in your cart, adjust quantities, and continue to checkout.
            </SheetDescription>
            <CurrencySwitcher className="w-fit" />
          </SheetHeader>
          {items.length > 0 ? (
            <div className="flex-grow overflow-y-auto -mx-6 px-6">
              <div className="divide-y divide-border">
                {items.map(item => <CartLineItem key={item.id} item={item} onUpdateQuantity={updateQuantity} />)}
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold">Your cart is empty</p>
              <p className="text-muted-foreground">Add some products to get started.</p>
            </div>
          )}
          <SheetFooter className="mt-auto border-t pt-6">
            <div className="w-full space-y-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal, currencyCode)}</span>
              </div>
              <Button size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={items.length === 0} onClick={handleCheckout}>
                Proceed to Checkout
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <CheckoutDialog isOpen={isCheckoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  );
}

function CartLineItem({ item, onUpdateQuantity }: { item: CartItem, onUpdateQuantity: (id: string | number, q: number) => void }) {
  const { currencyCode } = useCurrency();
  const image = findProductImagePlaceholder(item.image, item.name);
  const unitPrice = convertFromUsd(item.price, currencyCode);
  const lineTotal = convertFromUsd(item.price * item.quantity, currencyCode);
  return (
    <div className="flex items-center gap-4 py-4">
      {image && (
        <Image
          src={image.imageUrl}
          alt={item.name}
          width={64}
          height={64}
          className="h-16 w-16 rounded-md object-cover"
        />
      )}
      <div className="flex-grow">
        <p className="font-semibold">{item.name}</p>
        <p className="text-sm text-muted-foreground">{formatMoney(unitPrice, currencyCode)}</p>
        <div className="flex items-center gap-2 mt-2">
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
          <span>{item.quantity}</span>
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold">{formatMoney(lineTotal, currencyCode)}</p>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onUpdateQuantity(item.id, 0)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
