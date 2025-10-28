import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/pages/home/hero";
import { Services } from "@/components/pages/home/services";
import { WhyChooseUs } from "@/components/pages/home/why-choose-us";

import { Contact } from "@/components/pages/home/contact";
import { PartnerCTA } from "@/components/pages/home/partner-cta";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Services />
        <WhyChooseUs />
        <PartnerCTA />
                <Contact />
      </main>
      <Footer />
    </div>
  );
}
