import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Handshake } from "lucide-react";

export function PartnerCTA() {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-4xl rounded-lg bg-accent/10 p-8 text-center shadow-lg">
          <Handshake className="mx-auto h-12 w-12 text-accent" />
          <h2 className="mt-4 font-headline text-3xl font-bold text-accent-foreground">
            Let’s Make an Impact Together
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Join us in building healthy, empowered communities. Partner with us to support food security, farmer development, and youth employment in Zimbabwe.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" style={{ backgroundColor: '#FF9800', color: 'white' }} className="font-bold transform transition-transform hover:scale-105">
              <Link href="/become-a-partner">Partner With Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
