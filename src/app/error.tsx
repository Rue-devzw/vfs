"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Next.js App Router error:", error);
    }, [error]);

    return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center space-y-6 px-4 text-center">
            <div className="rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-2">
                <h2 className="font-headline text-3xl font-bold">Something went wrong</h2>
                <p className="mx-auto max-w-md text-muted-foreground">
                    We encountered an unexpected error while rendering this page.
                    Please try again or return to the home page.
                </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
                <Button onClick={() => reset()} variant="outline">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Try Again
                </Button>
                <Button onClick={() => (window.location.href = "/")}>
                    Return Home
                </Button>
            </div>
            {process.env.NODE_ENV === "development" && (
                <div className="mt-8 w-full max-w-2xl overflow-auto rounded-lg bg-muted p-4 text-left text-xs font-mono text-destructive">
                    {error.message}
                    {error.digest && <div className="mt-2 text-muted-foreground">Digest: {error.digest}</div>}
                </div>
            )}
        </div>
    );
}
