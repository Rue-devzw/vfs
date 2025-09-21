"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Download, Building2, Sparkles, Truck, Layers3, FileText, Users } from "lucide-react";

const wholesaleSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Phone number is required"),
  organizationType: z.string().min(1, "Select an option"),
  deliveryFrequency: z.string().min(1, "Select delivery frequency"),
  orderVolume: z.string().min(2, "Let us know the typical volume"),
  notes: z.string().optional(),
});

const sourcingSchema = z.object({
  itemName: z.string().min(2, "What do you need us to source?"),
  quantity: z.string().min(1, "Please include your volume"),
  timeline: z.string().min(1, "Let us know when you need it"),
  budget: z.string().optional(),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Phone number is required"),
  notes: z.string().optional(),
});

const corporateSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  registrationNumber: z.string().min(2, "Registration number required"),
  vatNumber: z.string().optional(),
  accountsContact: z.string().min(2, "Accounts contact required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Phone number is required"),
  monthlySpend: z.string().min(1, "Let us know your expected spend"),
  notes: z.string().optional(),
});

const digitalSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  notificationChannel: z.string().min(1, "Choose how we should notify you"),
});

type WholesaleFormValues = z.infer<typeof wholesaleSchema>;
type SourcingFormValues = z.infer<typeof sourcingSchema>;
type CorporateFormValues = z.infer<typeof corporateSchema>;
type DigitalFormValues = z.infer<typeof digitalSchema>;

export function ServicesOverview() {
  const services = [
    {
      icon: Truck,
      title: "Wholesale Supply",
      description: "Scheduled bulk deliveries for schools, NGOs, hospitality and retailers.",
      href: "#wholesale",
    },
    {
      icon: Layers3,
      title: "Pre-Pack Solutions",
      description: "Ready-to-use, graded and portion-packed vegetables for time-saving kitchens.",
      href: "#shop-prepack",
    },
    {
      icon: FileText,
      title: "Sourcing Services",
      description: "Hard-to-find produce and special orders handled end-to-end by our team.",
      href: "#sourcing",
    },
    {
      icon: Building2,
      title: "Corporate Accounts",
      description: "VAT-compliant invoicing and Pastel-ready statements for your finance team.",
      href: "#corporate",
    },
    {
      icon: Sparkles,
      title: "Valley Farm Digital",
      description: "Kitchenware, office and electronics coming soon to expand your toolkit.",
      href: "#digital",
    },
  ];

  return (
    <section id="services" className="py-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-4 uppercase tracking-wide">Business & Home Services</Badge>
          <h2 className="font-headline text-3xl font-bold md:text-4xl">More than a Store &mdash; Your Farm-to-Fork Partner</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Explore services designed for chefs, institutions and households that need reliability, speed and transparent pricing.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {services.map((service) => (
            <a
              key={service.title}
              href={service.href}
              className="group flex h-full flex-col rounded-xl border bg-background p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <service.icon className="h-10 w-10 text-primary transition group-hover:scale-110" />
              <h3 className="mt-4 font-headline text-xl font-semibold">{service.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
              <span className="mt-auto inline-flex items-center text-sm font-semibold text-primary">Explore &rarr;</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WholesaleSection() {
  const { toast } = useToast();
  const form = useForm<WholesaleFormValues>({
    resolver: zodResolver(wholesaleSchema),
    defaultValues: {
      businessName: "",
      contactName: "",
      email: "",
      phone: "",
      organizationType: "",
      deliveryFrequency: "Weekly",
      orderVolume: "",
      notes: "",
    },
  });

  const onSubmit = (values: WholesaleFormValues) => {
    toast({
      title: "Wholesale inquiry sent",
      description: `${values.businessName} will hear from our wholesale desk within 1 business day.`,
    });
    form.reset();
  };

  return (
    <section id="wholesale" className="py-16 bg-primary/5">
      <div className="container mx-auto grid gap-12 px-4 md:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div>
          <Badge className="mb-4 bg-primary/10 text-primary">Business Supply</Badge>
          <h2 className="font-headline text-3xl font-bold">Wholesale Supply</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Bulk orders with refrigerated logistics and transparent pricing. Perfect for schools, colleges, hospitals, NGOs, retail chains and hospitality groups.
          </p>
          <ul className="mt-6 space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3"><Truck className="mt-1 h-5 w-5 text-primary" /><span>Route-planned deliveries across Harare and the surrounding region.</span></li>
            <li className="flex items-start gap-3"><Layers3 className="mt-1 h-5 w-5 text-primary" /><span>Curated produce lists from trusted farmers and abattoirs.</span></li>
            <li className="flex items-start gap-3"><Users className="mt-1 h-5 w-5 text-primary" /><span>Dedicated account managers and flexible payment options.</span></li>
          </ul>
          <div className="mt-8 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><a href="mailto:wholesale@valleyfarmsecrets.com" className="font-medium text-primary hover:underline">wholesale@valleyfarmsecrets.com</a></div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /><a href="https://wa.me/263788679000" className="font-medium text-primary hover:underline">WhatsApp +263 788 679 000</a></div>
          </div>
          <Button variant="outline" className="mt-6" asChild>
            <a href="/docs/valley-farm-wholesale-overview.pdf" download>
              <Download className="mr-2 h-4 w-4" /> Download sample price list
            </a>
          </Button>
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Wholesale Inquiry</CardTitle>
            <CardDescription>Tell us what you need and we will schedule a call.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  name="businessName"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business or Institution</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sunrise Hotel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    name="contactName"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="organizationType"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organisation Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Retailer">Retailer</SelectItem>
                            <SelectItem value="Hospitality">Hospitality</SelectItem>
                            <SelectItem value="School">School / College</SelectItem>
                            <SelectItem value="NGO">NGO / Relief Agency</SelectItem>
                            <SelectItem value="Corporate">Corporate Canteen</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    name="email"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="phone"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone or WhatsApp</FormLabel>
                        <FormControl>
                          <Input placeholder="+263 7..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  name="deliveryFrequency"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Delivery Schedule</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Daily">Daily</SelectItem>
                          <SelectItem value="Twice Weekly">Twice Weekly</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="orderVolume"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typical Order Volume</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="List the items and approximate quantities you require" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="notes"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Share delivery instructions or budget goals" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Submit Inquiry</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function SourcingSection() {
  const { toast } = useToast();
  const form = useForm<SourcingFormValues>({
    resolver: zodResolver(sourcingSchema),
    defaultValues: {
      itemName: "",
      quantity: "",
      timeline: "",
      budget: "",
      contactName: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  const onSubmit = (values: SourcingFormValues) => {
    toast({
      title: "Sourcing request received",
      description: `We will start sourcing ${values.itemName} immediately.`,
    });
    form.reset();
  };

  return (
    <section id="sourcing" className="py-16">
      <div className="container mx-auto grid gap-12 px-4 md:px-6 lg:grid-cols-[1fr_1fr] lg:items-start">
        <Card className="order-2 shadow-lg lg:order-1">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Sourcing Request Form</CardTitle>
            <CardDescription>Share the specifics and our procurement team will coordinate the rest.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  name="itemName"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produce or Product</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Kenyan garden peas" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    name="quantity"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Quantity</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 500kg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="timeline"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Timeline</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. within 2 weeks" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  name="budget"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Price (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. USD 1.20/kg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    name="contactName"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="email"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} />
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
                      <FormLabel>Phone or WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="+263 7..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="notes"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Considerations</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Packaging requirements, certifications or delivery notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Submit Sourcing Request</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <div className="order-1 lg:order-2">
          <Badge className="mb-4 bg-primary/10 text-primary">On-Demand Produce</Badge>
          <h2 className="font-headline text-3xl font-bold">Special Orders &amp; Sourcing</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Need exotic fruits, institutional volumes or seasonal imports? Our sourcing desk coordinates farmers, cold-chain partners and customs to deliver exactly what you specify.
          </p>
          <ul className="mt-6 space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3"><Sparkles className="mt-1 h-5 w-5 text-primary" /><span>Competitive rates through direct relationships with producers across the region.</span></li>
            <li className="flex items-start gap-3"><Truck className="mt-1 h-5 w-5 text-primary" /><span>Consolidated shipping and customs handling for cross-border produce.</span></li>
            <li className="flex items-start gap-3"><Layers3 className="mt-1 h-5 w-5 text-primary" /><span>Success stories include green beans for airline caterers and export-grade berries.</span></li>
          </ul>
          <div className="mt-8 rounded-lg border bg-background p-6 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Need a quick quote?</p>
            <p className="mt-2">Email <a href="mailto:sourcing@valleyfarmsecrets.com" className="text-primary hover:underline">sourcing@valleyfarmsecrets.com</a> or WhatsApp us on <a href="https://wa.me/263772345678" className="text-primary hover:underline">+263 772 345 678</a>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CorporateAccountsSection() {
  const { toast } = useToast();
  const form = useForm<CorporateFormValues>({
    resolver: zodResolver(corporateSchema),
    defaultValues: {
      companyName: "",
      registrationNumber: "",
      vatNumber: "",
      accountsContact: "",
      email: "",
      phone: "",
      monthlySpend: "",
      notes: "",
    },
  });

  const onSubmit = (values: CorporateFormValues) => {
    toast({
      title: "Corporate account request submitted",
      description: `We'll reach out to ${values.accountsContact} to complete onboarding.`,
    });
    form.reset();
  };

  return (
    <section id="corporate" className="py-16 bg-primary/5">
      <div className="container mx-auto grid gap-12 px-4 md:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div>
          <Badge className="mb-4 bg-primary text-primary-foreground">Business Solutions</Badge>
          <h2 className="font-headline text-3xl font-bold">Corporate Accounts &amp; Invoicing</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Centralise procurement with VAT-ready documentation, Pastel integration and consolidated statements for your finance team.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-background p-4">
              <h3 className="font-semibold">Professional Billing</h3>
              <p className="mt-2 text-sm text-muted-foreground">Receive VAT-compliant tax invoices and credit notes straight into your inbox.</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <h3 className="font-semibold">Flexible Payment Terms</h3>
              <p className="mt-2 text-sm text-muted-foreground">30-day statements with limits tailored to your purchasing cycle.</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <h3 className="font-semibold">Pastel Ready</h3>
              <p className="mt-2 text-sm text-muted-foreground">Bulk uploads and account codes aligned to your existing ledger.</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <h3 className="font-semibold">Account Support</h3>
              <p className="mt-2 text-sm text-muted-foreground">Dedicated consultant to assist with reconciliations and statements.</p>
            </div>
          </div>
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Apply for a Corporate Account</CardTitle>
            <CardDescription>Complete the details and our accounts desk will confirm next steps.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  name="companyName"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Registered company" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    name="registrationNumber"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 1234/2020" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="vatNumber"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VAT Number (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 10012345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  name="accountsContact"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accounts Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Person responsible" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    name="email"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="accounts@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="phone"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+263 7..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  name="monthlySpend"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Monthly Spend</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. USD 5,000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="notes"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes for Our Team</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Delivery windows, invoicing preferences, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Submit Application</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function DigitalComingSoonSection() {
  const { toast } = useToast();
  const form = useForm<DigitalFormValues>({
    resolver: zodResolver(digitalSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      notificationChannel: "Email",
    },
  });

  const onSubmit = (values: DigitalFormValues) => {
    toast({
      title: "You’re on the Valley Farm Digital list!",
      description: `We will notify you via ${values.notificationChannel.toLowerCase()}.`,
    });
    form.reset({ fullName: "", email: "", phone: "", notificationChannel: "Email" });
  };

  return (
    <section id="digital" className="py-16">
      <div className="container mx-auto grid gap-10 px-4 md:px-6 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <Badge className="mb-4 bg-accent text-accent-foreground">Coming Soon</Badge>
          <h2 className="font-headline text-3xl font-bold">Valley Farm Digital</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We are curating a handpicked range of kitchenware, office essentials and smart electronics to complement your fresh produce orders. Be the first to know when the shelves go live.
          </p>
          <ul className="mt-6 space-y-2 text-muted-foreground">
            <li>• Commercial blenders and prep tools.</li>
            <li>• Office supplies, stationery and break-room must-haves.</li>
            <li>• Smart fridges, POS accessories and IoT sensors for cold rooms.</li>
          </ul>
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Join the waitlist</CardTitle>
            <CardDescription>Leave your details and we’ll send curated updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  name="fullName"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="phone"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+263 7..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="notificationChannel"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Notification Channel</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose one" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                          <SelectItem value="SMS">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Notify Me</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function AccountSupportSection() {
  return (
    <section id="account" className="py-16 bg-primary/5">
      <div className="container mx-auto grid gap-8 px-4 md:px-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-headline text-3xl font-bold">Manage Your Orders with My Account</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Create an account to access order history, track deliveries, request statements and manage corporate billing preferences.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-background p-6 shadow-sm">
              <h3 className="font-semibold">Order Tracking</h3>
              <p className="mt-2 text-sm text-muted-foreground">Live updates for dispatch, rider location and proof of delivery receipts.</p>
            </div>
            <div className="rounded-xl border bg-background p-6 shadow-sm">
              <h3 className="font-semibold">Saved Lists</h3>
              <p className="mt-2 text-sm text-muted-foreground">Build favourite product lists or standing orders for quick weekly checkouts.</p>
            </div>
            <div className="rounded-xl border bg-background p-6 shadow-sm">
              <h3 className="font-semibold">Corporate Wallet</h3>
              <p className="mt-2 text-sm text-muted-foreground">Allocate spend by department and download VAT-ready statements anytime.</p>
            </div>
            <div className="rounded-xl border bg-background p-6 shadow-sm">
              <h3 className="font-semibold">Customer Support</h3>
              <p className="mt-2 text-sm text-muted-foreground">Access FAQs, WhatsApp chat and same-day support tickets from your dashboard.</p>
            </div>
          </div>
        </div>
        <Card className="self-start shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Need Help?</CardTitle>
            <CardDescription>Talk to our support team directly from the store.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>• Visit the <a href="/store#contact" className="text-primary hover:underline">contact centre</a> for FAQs and policies.</p>
            <p>• Email <a href="mailto:support@valleyfarmsecrets.com" className="text-primary hover:underline">support@valleyfarmsecrets.com</a> for escalations.</p>
            <p>• Chat on WhatsApp at <a href="https://wa.me/263788679000" className="text-primary hover:underline">+263 788 679 000</a>.</p>
            <Separator />
            <p className="text-foreground font-semibold">Guest Checkout Available</p>
            <p>Prefer not to create an account? Use guest checkout and still receive delivery notifications.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function StoreContactSection() {
  return (
    <section id="contact" className="py-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-headline text-3xl font-bold">We’re here to help</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Reach our customer success desk any day of the week for order support, account queries or service consultations.
            </p>
            <div className="mt-6 space-y-3 text-muted-foreground">
              <div className="flex items-center gap-3"><Phone className="h-5 w-5 text-primary" /><a href="https://wa.me/263788679000" className="font-medium text-primary hover:underline">WhatsApp +263 788 679 000</a></div>
              <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-primary" /><a href="mailto:support@valleyfarmsecrets.com" className="font-medium text-primary hover:underline">support@valleyfarmsecrets.com</a></div>
            </div>
          </div>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Need a quick response?</CardTitle>
              <CardDescription>Our team typically replies within 2 hours during business days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>• Live chat available 08:00 &ndash; 18:00 (GMT+2).</p>
              <p>• Emergency delivery hotline for corporate accounts.</p>
              <p>• Detailed FAQs covering payments, deliveries and returns.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
