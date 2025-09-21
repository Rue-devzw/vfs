"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const quickOrderSchema = z.object({
  customerName: z.string().min(2, "Please enter your name"),
  company: z.string().optional(),
  phone: z.string().min(7, "WhatsApp or phone number required"),
  orderDetails: z.string().min(10, "Include the items and quantities you need"),
  deliveryDate: z.string().optional(),
});

type QuickOrderValues = z.infer<typeof quickOrderSchema>;

export function QuickOrderForm() {
  const { toast } = useToast();
  const form = useForm<QuickOrderValues>({
    resolver: zodResolver(quickOrderSchema),
    defaultValues: {
      customerName: "",
      company: "",
      phone: "",
      orderDetails: "",
      deliveryDate: "",
    },
  });

  const onSubmit = (values: QuickOrderValues) => {
    toast({
      title: "Batch order received",
      description: `We'll confirm availability for ${values.customerName} shortly.`,
    });
    form.reset();
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Batch Ordering Form</CardTitle>
        <CardDescription>Paste your shopping list for rapid fulfilment by our sales desk.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                name="customerName"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="company"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Business or organisation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              name="phone"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone / WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="+263 7..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="orderDetails"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order List</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="e.g. 10kg carrots, 5kg stir-fry mix, 20 packs diced onions"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="deliveryDate"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Delivery Date (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 24 June" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">Send Batch Order</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
