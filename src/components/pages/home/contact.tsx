import { contactDetails } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function Contact() {
  return (
    <section id="contact" className="py-16 md:py-24 bg-primary/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-headline text-3xl font-bold md:text-4xl">Contact Us</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Have questions? We're here to help. Reach out to us through any of the channels below.
          </p>
        </div>
        <Card className="mx-auto mt-12 max-w-4xl">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {contactDetails.map((detail, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0 text-primary">
                    <detail.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{detail.label}</h3>
                    {detail.href ? (
                      <Link
                        href={detail.href}
                        className="group inline-flex items-center gap-2 font-medium text-primary transition-colors hover:text-primary/80 whitespace-pre-wrap"
                      >
                        <span>{detail.value}</span>
                        <ArrowUpRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </Link>
                    ) : (
                      <p className="text-muted-foreground">{detail.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
