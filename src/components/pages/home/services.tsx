"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { services } from "@/lib/data";

export function Services() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleService = (index: number) => {
    setActiveIndex((current) => (current === index ? null : index));
  };

  return (
    <section id="services" className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-headline text-3xl font-bold md:text-4xl">Our Services</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From farm to table, we offer a complete range of services to meet your needs.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => {
            const isActive = activeIndex === index;

            return (
              <Card
                key={service.title}
                className={cn(
                  "group relative overflow-hidden border border-primary/10 text-white transition-shadow",
                  isActive ? "shadow-lg ring-2 ring-primary/20" : "hover:shadow-md"
                )}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${service.image})` }}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80"
                />
                <div className="relative flex h-full flex-col">
                  <button
                    type="button"
                    onClick={() => toggleService(index)}
                    className="flex w-full flex-col items-center gap-4 p-8 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-0"
                    aria-expanded={isActive}
                    aria-controls={`service-panel-${index}`}
                  >
                    <div
                      className={cn(
                        "rounded-full border border-white/30 bg-black/40 p-4 text-white transition-colors backdrop-blur",
                        isActive ? "bg-black/60" : "group-hover:bg-black/50"
                      )}
                    >
                      <service.icon className="h-8 w-8" aria-hidden="true" />
                    </div>
                    <span className="font-headline text-lg font-semibold">{service.title}</span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 text-white transition-transform duration-300",
                        isActive ? "rotate-180" : "rotate-0"
                      )}
                      aria-hidden="true"
                    />
                    <span className="sr-only">{isActive ? "Hide service details" : "Show service details"}</span>
                  </button>
                  {isActive ? (
                    <CardContent
                      id={`service-panel-${index}`}
                      className="relative z-10 space-y-4 border-t border-white/20 bg-black/50 p-6 text-center text-sm text-white backdrop-blur"
                    >
                      <p>{service.description}</p>
                      {service.purchaseLink ? (
                        <Button asChild size="sm">
                          <Link href={service.purchaseLink}>{service.purchaseLabel ?? "Purchase this service"}</Link>
                        </Button>
                      ) : null}
                    </CardContent>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
