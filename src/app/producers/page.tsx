import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Handshake, Mail } from "lucide-react";
import Link from 'next/link';
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Producer's Portal | Valley Farm Secrets",
  description: "A reliable market for your produce. Fair prices, commitment to growth, and the Farmers' Forum knowledge base.",
};
import { Card, CardContent } from "@/components/ui/card";
import { FarmersForum } from "@/components/pages/producers/farmers-forum";
import { PreBookingForm } from "@/components/pages/producers/pre-booking-form";

export default function ProducersPage() {
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
                Producer&rsquo;s Portal
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                We provide a reliable market for your produce,
                offering fair prices and a commitment to growing together.
              </p>
            </div>

            {/* Contact for Producers */}
            <div className="mt-12 text-center">
              <Card className="mx-auto inline-block">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 text-primary">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Producer Enquiries</h3>
                      <Link href="mailto:producers@valleyfarmsecrets.com" className="text-muted-foreground hover:text-primary transition-colors">
                        producers@valleyfarmsecrets.com
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
              {/* Farmers Forum (AI Feature) */}
              <div className="lg:sticky lg:top-24">
                <FarmersForum />
              </div>

              {/* Producer Pre-booking Form */}
              <div>
                <PreBookingForm />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
