"use client"

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useImageSlideshow } from "@/hooks/use-image-slideshow";
import { getHeroBackgroundPool } from "@/lib/hero-backgrounds";
import { ShoppingCart, Truck } from "lucide-react";

export function Hero() {
  const heroBackgroundPool = useMemo(() => getHeroBackgroundPool(), []);
  const { images: heroImages, currentIndex } = useImageSlideshow(heroBackgroundPool);

  return (
    <section className="relative h-[80svh] w-full overflow-hidden">
      <div className="absolute inset-0">
        {heroImages.length > 0 ? (
          heroImages.map((image, index) => (
            <div
              key={image.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentIndex ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={index !== currentIndex}
            >
              <Image
                src={image.imageUrl}
                alt={image.description}
                fill
                className="object-cover"
                priority={index === currentIndex}
                loading={index === currentIndex ? "eager" : "lazy"}
                data-ai-hint={image.imageHint}
              />
            </div>
          ))
        ) : (
          <div className="h-full w-full bg-secondary" />
        )}
      </div>

      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center p-4 text-center text-white">
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
            className="bg-primary text-primary-foreground transform transition-transform hover:scale-105 hover:bg-primary/90 group"
          >
            <Link href="/store">
              <ShoppingCart className="h-5 w-5 transition-transform group-hover:scale-110" aria-hidden="true" />
              <span>Shop Online</span>
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="bg-accent text-accent-foreground transform transition-transform hover:scale-105 hover:bg-accent/90 group"
          >
            <Link href="#wholesale">
              <Truck className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              <span>Wholesale Enquiries</span>
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
