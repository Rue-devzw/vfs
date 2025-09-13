import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/pages/home/hero";
import { Services } from "@/components/pages/home/services";
import { WhyChooseUs } from "@/components/pages/home/why-choose-us";
import { Locations } from "@/components/pages/home/locations";
import { Gallery } from "@/components/pages/home/gallery";
import { Wholesale } from "@/components/pages/home/wholesale";
import { Contact } from "@/components/pages/home/contact";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Services />
        <WhyChooseUs />
        <Locations />
        <Gallery />
        <Wholesale />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
