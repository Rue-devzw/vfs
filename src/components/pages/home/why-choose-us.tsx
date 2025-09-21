import { whyChooseUsFeatures } from "@/lib/data";

export function WhyChooseUs() {
  return (
    <section id="about" className="py-16 md:py-24 bg-primary/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-headline text-3xl font-bold md:text-4xl">Why Choose Valley Farm Secrets?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We are more than just a supplier; we are your partners in freshness and quality.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {whyChooseUsFeatures.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="rounded-full bg-background p-4 text-primary shadow-md">
                <feature.icon className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-headline text-xl font-semibold">{feature.title}</h3>
              <p className="mt-2 text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
