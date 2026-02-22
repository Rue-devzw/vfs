
import { ZesaFlow } from "@/features/zesa/components/ZesaFlow";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ZesaPage() {
    return (
        <div className="min-h-screen bg-muted/20 pb-20 pt-10">
            <div className="container mx-auto max-w-4xl px-4">
                <div className="mb-8">
                    <Button variant="ghost" asChild className="mb-4 pl-0 hover:pl-2 transition-all">
                        <Link href="/store" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Store
                        </Link>
                    </Button>
                    <h1 className="font-headline text-3xl font-bold md:text-4xl">ZESA Token Purchase</h1>
                    <p className="mt-2 text-muted-foreground">
                        Buy electricity tokens instantly. Powered by ZB Bank.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
                    <div className="flex flex-col gap-6">
                        <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted shadow-lg md:aspect-square lg:aspect-video">
                            <Image
                                src="/images/Zesa.webp"
                                alt="ZESA Token"
                                fill
                                className="object-cover"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-4 left-4 text-white">
                                <p className="text-sm font-medium opacity-90">Instant Top-up</p>
                                <h2 className="text-xl font-bold">Safe & Reliable</h2>
                            </div>
                        </div>

                        <div className="space-y-4 rounded-2xl bg-primary/5 p-6 border border-primary/10">
                            <h3 className="font-semibold text-primary">How it works</h3>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-white font-bold">1</div>
                                    <span>Enter your 11-digit meter number.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-white font-bold">2</div>
                                    <span>Verify your customer details.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-white font-bold">3</div>
                                    <span>Enter amount and complete payment.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <ZesaFlow />
                    </div>
                </div>
            </div>
        </div>
    );
}
