"use client"

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function Hero() {
  const heroImage = PlaceHolderImages.find(p => p.id === "hero-produce");

  return (
    <section className="relative h-[80svh] w-full overflow-hidden">
      {heroImage ? (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover"
          priority
          data-ai-hint={heroImage.imageHint}
        />
      ) : (
        <div className="w-full h-full bg-secondary" />
      )}

      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white p-4">
        <h1 className="font-headline text-5xl font-bold md:text-7xl">
          Freshness. Quality. Convenience.
        </h1>
        <p className="mt-4 max-w-2xl text-lg md:text-xl">
          Your trusted partner for farm-fresh produce, from our fields to your table.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground transform transition-transform hover:scale-105"
          >
            <Link href="/store">Shop Online</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="bg-accent hover:bg-accent/90 text-accent-foreground transform transition-transform hover:scale-105"
          >
            <Link href="#wholesale">Wholesale Enquiries</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
