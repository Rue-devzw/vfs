import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Handshake } from "lucide-react";
import { FarmersForum } from "@/components/pages/producers/farmers-forum";
import { PreBookingForm } from "@/components/pages/producers/pre-booking-form";

export default function BecomeAPartnerPage() {
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
                Become a Partner
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Partner with Valley Farm Secrets. We provide a reliable market for your produce,
                offering fair prices and a commitment to growing together.
              </p>
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
