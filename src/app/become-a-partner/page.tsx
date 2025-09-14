"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Handshake, Sprout, Users, Heart, Globe, Building, User, Phone, Mail, FileText, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";


const impactAreas = [
    {
        icon: Sprout,
        title: "Food Security & Nutrition",
    },
    {
        icon: Users,
        title: "Farmer Empowerment",
    },
    {
        icon: User,
        title: "Youth & Women Empowerment",
    },
    {
        icon: Heart,
        title: "Health & Wellness Campaigns",
    },
    {
        icon: Globe,
        title: "Sustainability Projects",
    }
];

const partnershipOpportunities = [
    {
        icon: CheckCircle,
        title: "Funding or Grants",
        description: "Support community food security and empowerment projects."
    },
    {
        icon: CheckCircle,
        title: "CSR Collaborations",
        description: "Work with us on nutrition, health, and sustainability campaigns."
    },
    {
        icon: CheckCircle,
        title: "Impact Investments",
        description: "Co-invest in expansion of cold storage, delivery fleets, and farmer networks."
    },
    {
        icon: CheckCircle,
        title: "Training & Skills Support",
        description: "Provide training, technology, or mentorship to build capacity."
    }
];

const formSchema = z.object({
  organizationName: z.string().min(2, "Organisation/Producer Name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  phone: z.string().min(10, "A valid phone number is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Please provide some details in your proposal.").max(1000),
});


export default function BecomeAPartnerPage() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationName: "",
      contactPerson: "",
      phone: "",
      email: "",
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Partnership Proposal:", values);
    toast({
      title: "✅ Thank you for submitting your partnership proposal to Valley Farm Secrets.",
      description: "Our team will review it and get back to you within 5–7 working days. For urgent queries: +263 788 679 000 | +263 711 406 919.",
    });
    form.reset();
  }


  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow bg-background py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-4xl">
            {/* Hero/Intro Section */}
            <div className="text-center">
              <div className="inline-flex rounded-full bg-primary/10 p-4">
                <Handshake className="h-10 w-10 text-primary" />
              </div>
              <h1 className="mt-4 font-headline text-4xl font-bold md:text-5xl">
                Let’s Make an Impact Together
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                At Valley Farm Secrets, we’re more than a food business — we are building healthy, empowered communities. Partner with us to support food security, farmer development, and youth employment in Zimbabwe.
              </p>
            </div>

            {/* Impact Areas */}
            <section id="impact-areas" className="mt-16">
                <div className="text-center">
                    <h2 className="font-headline text-3xl font-bold">Our Impact Areas</h2>
                </div>
                <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {impactAreas.map((point) => (
                        <div key={point.title} className="text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <point.icon className="h-8 w-8" />
                            </div>
                            <p className="mt-3 text-sm font-semibold">{point.title}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Partnership Opportunities */}
            <section id="opportunities" className="mt-20">
                <div className="text-center">
                    <h2 className="font-headline text-3xl font-bold">Opportunities to Partner</h2>
                </div>
                <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
                     {partnershipOpportunities.map((opportunity) => (
                        <Card key={opportunity.title} className="flex items-start gap-4 p-6 transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-md">
                           <div className="flex-shrink-0 text-primary mt-1">
                                <opportunity.icon className="h-6 w-6" />
                           </div>
                           <div>
                                <h3 className="text-lg font-bold">{opportunity.title}</h3>
                                <p className="mt-1 text-muted-foreground">{opportunity.description}</p>
                           </div>
                        </Card>
                     ))}
                </div>
            </section>

            {/* Contact Form Section */}
            <section id="partner-form" className="mt-20">
                <div className="text-center">
                    <h2 className="font-headline text-3xl font-bold">Become a Partner</h2>
                    <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
                        Ready to explore a partnership? Fill out the form below or email us at <Link href="mailto:partners@valleyfarmsecrets.com" className="text-primary underline">partners@valleyfarmsecrets.com</Link>.
                    </p>
                </div>
                <Card className="mt-10 p-6 sm:p-8">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <FormField control={form.control} name="organizationName" render={({ field }) => (
                          <FormItem><FormLabel>Organisation / Producer Name</FormLabel><FormControl><Input placeholder="Your Organisation" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="contactPerson" render={({ field }) => (
                          <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                       <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+263 7..." {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                       </div>
                      <FormField control={form.control} name="message" render={({ field }) => (
                        <FormItem><FormLabel>Proposal or Message</FormLabel><FormControl><Textarea placeholder="Tell us about your proposal or how you'd like to partner with us..." rows={6} {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <Button type="submit" size="lg" className="w-full" style={{ backgroundColor: '#4CAF50' }}>Submit Proposal</Button>
                    </form>
                  </Form>
                </Card>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
