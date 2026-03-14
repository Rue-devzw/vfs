import { notFound } from "next/navigation";
import { getDigitalServiceConfig, isDigitalServiceId } from "@/lib/digital-services";
import { GenericDigitalFlow } from "./payment-flow";

type RouteParams = Promise<{ service: string }>;

export default async function DigitalServicePage({ params }: { params: RouteParams }) {
  const { service } = await params;
  if (!isDigitalServiceId(service) || service === "zesa") {
    notFound();
  }
  const config = getDigitalServiceConfig(service);
  if (!config) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-20 pt-10">
      <div className="container mx-auto max-w-3xl px-4">
        <h1 className="font-headline text-3xl font-bold">{config.label}</h1>
        <p className="mt-2 text-muted-foreground">{config.supportMessage ?? "WalletPlus express payment for your account."}</p>
        <div className="mt-8">
          <GenericDigitalFlow
            service={service}
            serviceLabel={config.label}
            accountLabel={config.accountLabel}
            availabilityStatus={config.status}
            supportMessage={config.supportMessage}
          />
        </div>
      </div>
    </div>
  );
}
