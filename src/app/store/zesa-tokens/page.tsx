
import { ZesaFlow } from "@/features/zesa/components/ZesaFlow";
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

                <div className="flex justify-center">
                    <ZesaFlow />
                </div>
            </div>
        </div>
    );
}
