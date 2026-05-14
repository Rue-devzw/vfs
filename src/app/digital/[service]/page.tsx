import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getDigitalServiceConfig, isDigitalServiceId } from "@/lib/digital-services";
import { cn } from "@/lib/utils";
import { GenericDigitalFlow } from "./payment-flow";

type RouteParams = Promise<{ service: string }>;

const serviceNav = [
  { id: "zesa", href: "/digital/zesa" },
  { id: "dstv", href: "/digital/dstv" },
  { id: "nyaradzo", href: "/digital/nyaradzo" },
  { id: "cimas", href: "/digital/cimas" },
] as const;

export default async function DigitalServicePage({ params }: { params: RouteParams }) {
  const { service } = await params;
  if (!isDigitalServiceId(service) || service === "councils" || service === "internet") {
    notFound();
  }
  const config = getDigitalServiceConfig(service);
  if (!config) {
    notFound();
  }

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 space-y-5 border-b pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/digital"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              All services
            </Link>
            <nav className="flex flex-wrap items-center gap-2" aria-label="Digital services">
              {serviceNav.map((item) => {
                const itemConfig = getDigitalServiceConfig(item.id);
                if (!itemConfig) {
                  return null;
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "inline-flex min-w-[104px] items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                      item.id === service
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    {itemConfig.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Digital checkout</p>
          <h1 className="mt-3 font-headline text-3xl font-bold md:text-4xl">{config.label}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            {config.supportMessage ?? "Standard secure checkout for your digital account payment."}
          </p>
        </div>
        <div className="mt-8">
          <GenericDigitalFlow
            service={service}
            serviceLabel={config.label}
            accountLabel={config.accountLabel}
            availabilityStatus={config.status}
            supportMessage={config.supportMessage}
            formFields={config.formFields}
          />
        </div>
      </div>
    </div>
  );
}
