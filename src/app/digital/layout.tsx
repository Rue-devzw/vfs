import { ReactNode } from "react";
import { CurrencySwitcher } from "@/components/currency/currency-switcher";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Digital Services",
    description: "Pay essential accounts, including ZESA, DSTV, Nyaradzo, and CIMAS seamlessly with Valley Farm Secrets digital services.",
    alternates: {
        canonical: "/digital",
    },
};

export default function DigitalServicesLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background pb-16 text-foreground">
            <div className="border-b bg-card/70">
                <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                                    Valleyfarm Digital
                                </span>
                            </div>
                            <h1 className="font-headline text-4xl font-bold leading-tight text-foreground md:text-6xl">
                                Digital services
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                                Choose a service below to continue.
                            </p>
                        </div>
                        <CurrencySwitcher />
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 md:px-6 md:py-10">
                {children}
            </main>
        </div>
    );
}
