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
import { Loader2 } from "lucide-react";

const BIKER_DELIVERY_FEE = 5.00;

const formSchema = z.object({
  isDiasporaGift: z.boolean().default(false),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  deliveryMethod: z.enum(["collect", "delivery"]).default("collect"),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerEmail: z.string().email().optional(),
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
  const { state } = useCart();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isDiasporaGift: false,
      deliveryMethod: "collect",
    },
  });
  const { isSubmitting } = form.formState;

  const { watch } = form;
  const isDiasporaGift = watch("isDiasporaGift");
  const deliveryMethod = watch("deliveryMethod");

  const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + (deliveryMethod === 'delivery' ? BIKER_DELIVERY_FEE : 0);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await fetch("/api/paynow/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: `order_${Date.now()}`,
          items: state.items.map(item => ({ name: item.name, price: item.price })),
          email: values.customerEmail
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate Paynow payment");
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error("No redirect URL received from server.");
      }

    } catch (error) {
      console.error('Checkout submission failed', error);

      const message =
        error instanceof Error ? error.message : 'Something went wrong while placing your order.';

      toast({
        title: "Order failed",
        description: message,
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
                  <FormItem><FormLabel>Recipient&rsquo;s Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="recipientPhone" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Recipient&rsquo;s Phone</FormLabel><FormControl><Input placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>
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
                    <FormField name="customerEmail" control={form.control} render={({ field }) => (<FormItem><FormLabel>Your Email</FormLabel><FormControl><Input placeholder="me@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                )}
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between"><p>Subtotal</p><p>${subtotal.toFixed(2)}</p></div>
              {deliveryMethod === 'delivery' && <div className="flex justify-between"><p>Delivery Fee</p><p>${BIKER_DELIVERY_FEE.toFixed(2)}</p></div>}
              <div className="flex justify-between text-xl font-bold"><p>Total</p><p>${total.toFixed(2)}</p></div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Pay with Paynow"
                )}
              </Button>
            </DialogFooter>
            <p aria-live="polite" className="sr-only" role="status">
              {isSubmitting ? "Submitting..." : ""}
            </p>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
