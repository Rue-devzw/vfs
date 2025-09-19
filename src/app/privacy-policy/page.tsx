import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-12 md:px-6">
        <h1 className="font-headline text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">
          Valley Farm Secrets respects your privacy. This summary explains how we collect, use, and safeguard your information when you shop with us or engage our services.
        </p>
        <section className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="font-headline text-xl text-foreground">Information We Collect</h2>
            <p className="mt-2">We collect contact details, delivery addresses, and order history to process purchases and provide business services. For corporate accounts we may request company registration and VAT numbers.</p>
          </div>
          <div>
            <h2 className="font-headline text-xl text-foreground">How We Use Your Data</h2>
            <p className="mt-2">Your information is used to fulfil orders, schedule deliveries, issue invoices, and share updates you have opted into. We do not sell personal data to third parties.</p>
          </div>
          <div>
            <h2 className="font-headline text-xl text-foreground">Your Rights</h2>
            <p className="mt-2">You may request access, updates, or deletion of your information by emailing <a className="text-primary hover:underline" href="mailto:privacy@valleyfarmsecrets.com">privacy@valleyfarmsecrets.com</a>.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
