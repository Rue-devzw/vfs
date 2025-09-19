import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-12 md:px-6">
        <h1 className="font-headline text-4xl font-bold">Terms of Service</h1>
        <p className="mt-4 text-muted-foreground">
          These terms outline the relationship between Valley Farm Secrets and our customers when purchasing products or contracting services through our store.
        </p>
        <section className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="font-headline text-xl text-foreground">Orders &amp; Fulfilment</h2>
            <p className="mt-2">All orders are subject to availability. We aim for same-day dispatch within Harare for orders placed before 12:00. Bulk and wholesale deliveries follow the agreed schedule.</p>
          </div>
          <div>
            <h2 className="font-headline text-xl text-foreground">Payments</h2>
            <p className="mt-2">We accept local and diaspora-friendly payment methods. Corporate account terms are issued upon approval and may require signed agreements.</p>
          </div>
          <div>
            <h2 className="font-headline text-xl text-foreground">Returns &amp; Support</h2>
            <p className="mt-2">Perishable goods issues must be reported within 12 hours of delivery. Contact <a className="text-primary hover:underline" href="mailto:support@valleyfarmsecrets.com">support@valleyfarmsecrets.com</a> for assistance.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
