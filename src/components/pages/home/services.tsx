import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { services } from "@/lib/data";

export function Services() {
  return (
    <section id="services" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-headline text-3xl font-bold md:text-4xl">Our Services</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From farm to table, we offer a complete range of services to meet your needs.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <Card key={index} className="transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
              <CardHeader className="flex flex-col items-center text-center p-8">
                <div className="rounded-full bg-primary/10 p-4 text-primary">
                  <service.icon className="h-8 w-8" />
                </div>
                <CardTitle className="mt-4 font-headline text-xl">{service.title}</CardTitle>
                <CardDescription className="mt-2 text-base">{service.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
