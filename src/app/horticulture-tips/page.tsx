import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { horticultureTips } from "@/lib/data";
import { BookMarked } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Horticulture Tips | Valley Farm Secrets",
  description: "Explore our knowledge base for farmers and producers. Curated tips for successful farming, soil prep, and pest control.",
};

export default function HorticultureTipsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow bg-background">
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="text-center">
            <div className="inline-flex rounded-full bg-primary/10 p-4">
              <BookMarked className="h-10 w-10 text-primary" />
            </div>
            <h1 className="mt-4 font-headline text-4xl font-bold md:text-5xl">
              Horticulture Tips
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              A knowledge base for farmers and producers. Explore our curated tips for successful farming.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {horticultureTips.map((tip, index) => (
              <Card key={index} className="flex flex-col transform transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl">
                <CardHeader className="flex-grow">
                  <div className="flex items-center gap-4">
                    <div className="rounded-md bg-primary/10 p-3 text-primary">
                      <tip.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="font-headline text-xl">{tip.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-4">{tip.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
