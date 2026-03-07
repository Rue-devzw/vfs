import { notFound } from "next/navigation";
import { DIGITAL_SERVICE_LABELS, isDigitalServiceId } from "@/lib/digital-services";
import { GenericDigitalFlow } from "./payment-flow";

type RouteParams = Promise<{ service: string }>;

export default async function DigitalServicePage({ params }: { params: RouteParams }) {
  const { service } = await params;
  if (!isDigitalServiceId(service) || service === "zesa") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-20 pt-10">
      <div className="container mx-auto max-w-3xl px-4">
        <h1 className="font-headline text-3xl font-bold">{DIGITAL_SERVICE_LABELS[service]}</h1>
        <p className="mt-2 text-muted-foreground">WalletPlus express payment for your account.</p>
        <div className="mt-8">
          <GenericDigitalFlow service={service} serviceLabel={DIGITAL_SERVICE_LABELS[service]} />
        </div>
      </div>
    </div>
  );
}
