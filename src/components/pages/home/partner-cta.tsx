import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Handshake, ArrowRight } from "lucide-react";

export function PartnerCTA() {
  return (
    <section className="relative bg-background py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-lg p-8 text-center shadow-lg">
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/images/hero-6.webp)" }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-accent/70 via-black/60 to-black/80"
          />
          <div className="relative z-10 space-y-4 text-white">
            <Handshake className="mx-auto h-12 w-12 text-white drop-shadow" />
            <h2 className="font-headline text-3xl font-bold">
            Let&rsquo;s Make an Impact Together
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-white/90">
            Join us in building healthy, empowered communities. Partner with us to support food security, farmer development, and youth employment in Zimbabwe.
            </p>
            <div className="pt-4">
              <Button
                asChild
                size="lg"
                className="group inline-flex items-center gap-2 bg-[#FF9800] font-bold text-white transition-transform hover:scale-105 hover:bg-[#f57c00]"
              >
                <Link href="/become-a-partner">
                  <span>Partner With Us</span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
