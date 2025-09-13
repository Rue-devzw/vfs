"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

const formSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  phone: z.string().min(10, "A valid phone number is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Please provide some details about your needs").max(500),
});

export function Wholesale() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      phone: "",
      email: "",
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values); // In a real app, you'd send this to a server
    toast({
      title: "Quote Request Sent!",
      description: "Thank you! We will get back to you shortly.",
    });
    form.reset();
  }

  return (
    <section id="wholesale" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-headline text-3xl font-bold md:text-4xl">Wholesale Enquiries</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Partner with us to supply your business with the freshest produce available.
            </p>
            <ul className="mt-6 space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary mt-1" />
                <span>Bulk pricing for restaurants, hotels, and retailers.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary mt-1" />
                <span>Customized orders to meet your specific needs.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary mt-1" />
                <span>Reliable delivery schedules to keep your business running.</span>
              </li>
            </ul>
          </div>
          <Card className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Company Ltd." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+263 777 123 456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="jane.doe@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Requirements</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Tell us about the produce and quantities you're interested in..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Request a Wholesale Quote</Button>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </section>
  );
}
