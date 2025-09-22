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
                  "overflow-hidden border border-primary/10 bg-card text-card-foreground transition-shadow",
                  isActive ? "shadow-lg ring-2 ring-primary/20" : "hover:shadow-md"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleService(index)}
                  className="group flex w-full flex-col items-center gap-4 p-8 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-expanded={isActive}
                  aria-controls={`service-panel-${index}`}
                >
                  <div
                    className={cn(
                      "rounded-full border border-primary/20 bg-primary/10 p-4 text-primary transition-colors",
                      isActive ? "bg-primary/15" : "group-hover:bg-primary/15"
                    )}
                  >
                    <service.icon className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <span className="font-headline text-lg font-semibold">{service.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-primary transition-transform duration-300",
                      isActive ? "rotate-180" : "rotate-0"
                    )}
                    aria-hidden="true"
                  />
                  <span className="sr-only">{isActive ? "Hide service details" : "Show service details"}</span>
                </button>
                {isActive ? (
                  <CardContent
                    id={`service-panel-${index}`}
                    className="space-y-4 border-t border-primary/10 bg-muted/30 p-6 text-center"
                  >
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                    {service.purchaseLink ? (
                      <Button asChild size="sm">
                        <Link href={service.purchaseLink}>{service.purchaseLabel ?? "Purchase this service"}</Link>
                      </Button>
                    ) : null}
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
