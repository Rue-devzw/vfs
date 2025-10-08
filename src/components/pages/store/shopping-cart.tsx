"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from '@/components/ui/sheet';
import { useCart, CartItem } from './cart-context';
import { ShoppingBag, Trash2, Plus, Minus } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CheckoutDialog } from './checkout-dialog';

export function ShoppingCart() {
  const { state: { items }, dispatch } = useCart();
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cashSubtotal = items.reduce((sum, item) => {
    const effectiveCashPrice = typeof item.cashPrice === 'number' ? item.cashPrice : item.price;
    return sum + effectiveCashPrice * item.quantity;
  }, 0);

  const updateQuantity = (id: number, quantity: number) => {
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
              <div className="space-y-1">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Online subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {Math.abs(cashSubtotal - subtotal) > 0.009 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Pay-in-store cash total</span>
                    <span>${cashSubtotal.toFixed(2)}</span>
                  </div>
                )}
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

function CartLineItem({ item, onUpdateQuantity }: { item: CartItem, onUpdateQuantity: (id: number, q: number) => void }) {
  const image = PlaceHolderImages.find(p => p.id === item.image) || PlaceHolderImages.find(p => p.id === 'product-apples');
  return (
    <div className="flex items-center gap-4 py-4">
      {image && <Image src={image.imageUrl} alt={item.name} width={64} height={64} className="rounded-md object-cover" />}
      <div className="flex-grow">
        <p className="font-semibold">{item.name}</p>
        <p className="text-sm text-muted-foreground">Online: ${item.price.toFixed(2)}</p>
        {typeof item.cashPrice === 'number' && Math.abs(item.cashPrice - item.price) > 0.009 && (
          <p className="text-xs text-muted-foreground">Cash: ${item.cashPrice.toFixed(2)}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
          <span>{item.quantity}</span>
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onUpdateQuantity(item.id, 0)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
