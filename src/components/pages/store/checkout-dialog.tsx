"use client";

import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useCart } from './cart-context';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const BIKER_DELIVERY_FEE = 5.00;

const formSchema = z.object({
  isDiasporaGift: z.boolean().default(false),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  deliveryMethod: z.enum(["collect", "delivery"]).default("collect"),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  paymentMethod: z.enum(["now", "on_delivery"]).default("now"),
}).superRefine((data, ctx) => {
    if (data.isDiasporaGift) {
        if (!data.recipientName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Recipient name is required.", path: ["recipientName"] });
        if (!data.recipientPhone) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Recipient phone is required.", path: ["recipientPhone"] });
    } else {
        if (data.deliveryMethod === 'delivery') {
            if (!data.customerName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Your name is required for delivery.", path: ["customerName"] });
            if (!data.customerPhone) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Your phone is required for delivery.", path: ["customerPhone"] });
            if (!data.customerAddress) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Your address is required for delivery.", path: ["customerAddress"] });
        }
    }
});


interface CheckoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutDialog({ isOpen, onOpenChange }: CheckoutDialogProps) {
  const { state, dispatch } = useCart();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isDiasporaGift: false,
      deliveryMethod: "collect",
      paymentMethod: "now",
    },
  });

  const { watch, reset } = form;
  const isDiasporaGift = watch("isDiasporaGift");
  const deliveryMethod = watch("deliveryMethod");
  
  const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + (deliveryMethod === 'delivery' ? BIKER_DELIVERY_FEE : 0);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form: "checkout", ...values, items: state.items, total }),
      });

      if (response.ok) {
        toast({
          title: "Order Placed Successfully!",
          description: "Thank you for your purchase. You'll receive a confirmation shortly.",
        });
        dispatch({ type: 'CLEAR_CART' });
        onOpenChange(false);
        reset();
      } else {
        toast({
          title: "Order failed",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Order failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-3xl">Checkout</DialogTitle>
          <DialogDescription>Please confirm your details to complete the order.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            
            <FormField name="isDiasporaGift" control={form.control} render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div className="space-y-1 leading-none">
                    <FormLabel>This is a gift for someone in Zimbabwe</FormLabel>
                    <FormDescription>Defaults to remittance payment.</FormDescription>
                </div>
                </FormItem>
            )} />

            {isDiasporaGift ? (
              <div className="space-y-4 p-4 border rounded-md animate-fade-in-up">
                <FormField name="recipientName" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Recipient's Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="recipientPhone" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Recipient's Phone</FormLabel><FormControl><Input placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            ) : (
              <div className="space-y-4 p-4 border rounded-md animate-fade-in-up">
                <FormField name="deliveryMethod" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Delivery/Pickup</FormLabel>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="collect" /></FormControl><FormLabel className="font-normal">In-person Collection (Free)</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="delivery" /></FormControl><FormLabel className="font-normal">Biker Delivery (${BIKER_DELIVERY_FEE.toFixed(2)})</FormLabel></FormItem>
                    </RadioGroup><FormMessage />
                  </FormItem>
                )} />
                {deliveryMethod === 'delivery' && (
                  <div className="space-y-4 animate-fade-in-up">
                    <FormField name="customerName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="customerPhone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Phone</FormLabel><FormControl><Input placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="customerAddress" control={form.control} render={({ field }) => (<FormItem><FormLabel>Delivery Address</FormLabel><FormControl><Input placeholder="123 Main St, Harare" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                )}
                 <FormField name="paymentMethod" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Payment</FormLabel>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="now" /></FormControl><FormLabel className="font-normal">Pay Full Amount Now</FormLabel></FormItem>
                      {deliveryMethod === 'delivery' && <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="on_delivery" /></FormControl><FormLabel className="font-normal">Pay Biker on Delivery</FormLabel></FormItem>}
                    </RadioGroup><FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            <Separator />

            <div className="space-y-2">
                <div className="flex justify-between"><p>Subtotal</p><p>${subtotal.toFixed(2)}</p></div>
                {deliveryMethod === 'delivery' && <div className="flex justify-between"><p>Delivery Fee</p><p>${BIKER_DELIVERY_FEE.toFixed(2)}</p></div>}
                <div className="flex justify-between text-xl font-bold"><p>Total</p><p>${total.toFixed(2)}</p></div>
            </div>
            
            <DialogFooter>
                <Button type="submit" size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Place Order</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
