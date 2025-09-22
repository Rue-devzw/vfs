import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { locations } from "@/lib/data";
import Link from "next/link";
import { MapPin, ExternalLink } from "lucide-react";

export function Locations() {
  return (
    <section id="locations" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-headline text-3xl font-bold md:text-4xl">Our Branches</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Visit us at our convenient locations in Gweru and Harare.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {locations.map((location, index) => (
            <Card key={index} className="flex flex-col transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">{location.city}</CardTitle>
                <CardDescription>{location.role}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted/40">
                  <iframe
                    src={location.mapEmbedUrl}
                    className="absolute inset-0 h-full w-full"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`${location.city} location map`}
                  />
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{location.address}</span>
                </div>
                <div className="pt-2">
                  <h4 className="font-semibold">Services Available:</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {location.services.map((service, i) => (
                      <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">{service}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 group">
                  <Link href={location.mapLink} target="_blank" rel="noopener noreferrer" aria-label={`Open ${location.city} location on Google Maps`}>
                    <span>View larger on Google Maps</span>
                    <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
