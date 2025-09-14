import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Handshake, Zap, Target, BarChart, Scale, Heart, ShieldCheck, TrendingUp, Lightbulb, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";

const whyPartnerPoints = [
    {
        icon: ShieldCheck,
        title: "Established Operations",
        description: "Retail, wholesale, and butchery services with a proven track record."
    },
    {
        icon: TrendingUp,
        title: "Proven Experience",
        description: "Successfully supplying schools, NGOs, churches, and other institutions."
    },
    {
        icon: BarChart,
        title: "Transparent Accounting",
        description: "Utilizing Pastel POS and providing VAT-compliant invoicing for full transparency."
    },
    {
        icon: Heart,
        title: "Trusted Reputation",
        description: "A strong community presence built on trust and reliable service."
    },
    {
        icon: Target,
        title: "Scalable Vision",
        description: "Aligned with Zimbabwe Vision 2030 & SDGs to drive long-term growth."
    }
];

const partnershipOpportunities = [
    {
        icon: Lightbulb,
        title: "Grants & Funding",
        description: "Support our community food security and empowerment projects through grants."
    },
    {
        icon: Zap,
        title: "CSR Collaborations",
        description: "Work with us on impactful nutrition, health, and sustainability campaigns."
    },
    {
        icon: Scale,
        title: "Impact Investment",
        description: "Co-invest in expanding cold storage, delivery fleets, and our farmer network."
    },
    {
        icon: Handshake,
        title: "Skill Support",
        description: "Provide training, technology, or mentorship to help us build capacity."
    }
];

export default function BecomeAPartnerPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow bg-background py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-4xl">
            {/* Hero/Intro Section */}
            <div className="text-center">
              <div className="inline-flex rounded-full bg-primary/10 p-4">
                <Handshake className="h-10 w-10 text-primary" />
              </div>
              <h1 className="mt-4 font-headline text-4xl font-bold md:text-5xl">
                Partner With Us
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Join Valley Farm Secrets in our mission to strengthen food security and empower local communities. We offer a range of partnership opportunities for organizations that share our vision.
              </p>
            </div>

            {/* Why Partner with Us */}
            <section id="why-partner" className="mt-16">
                <div className="text-center">
                    <h2 className="font-headline text-3xl font-bold">Why Partner With Us?</h2>
                    <p className="mx-auto mt-2 max-w-xl text-muted-foreground">We are a reliable and forward-thinking organization with a strong foundation.</p>
                </div>
                <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {whyPartnerPoints.map((point) => (
                        <Card key={point.title} className="text-center transform transition-transform duration-300 hover:-translate-y-2 hover:shadow-xl">
                            <CardHeader>
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <point.icon className="h-6 w-6" />
                                </div>
                                <CardTitle className="mt-4 font-headline text-xl">{point.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{point.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Partnership Opportunities */}
            <section id="opportunities" className="mt-20">
                <div className="text-center">
                    <h2 className="font-headline text-3xl font-bold">Partnership Opportunities</h2>
                    <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Let's collaborate to create a sustainable impact.</p>
                </div>
                <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
                     {partnershipOpportunities.map((opportunity) => (
                        <Card key={opportunity.title} className="flex flex-col sm:flex-row items-start gap-6 p-6">
                           <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                                <opportunity.icon className="h-7 w-7" />
                           </div>
                           <div>
                                <h3 className="font-headline text-xl font-bold">{opportunity.title}</h3>
                                <p className="mt-2 text-muted-foreground">{opportunity.description}</p>
                           </div>
                        </Card>
                     ))}
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact-partner" className="mt-20">
                <div className="text-center">
                    <h2 className="font-headline text-3xl font-bold">Get in Touch</h2>
                    <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
                        Ready to explore a partnership? Reach out to our dedicated team.
                    </p>
                </div>
                <div className="mt-10">
                    <Card className="mx-auto max-w-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0 text-primary">
                                    <Mail className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Partnerships Email</h3>
                                    <Link href="mailto:partners@valleyfarmsecrets.com" className="text-muted-foreground hover:text-primary transition-colors">
                                        partners@valleyfarmsecrets.com
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
