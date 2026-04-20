"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { consumeGatewayRedirectHtml, submitGatewayRedirectHtml } from "@/lib/payments/browser";

export default function ThreeDSHandoffPage() {
  const [missingPayload, setMissingPayload] = useState(false);

  useEffect(() => {
    const html = consumeGatewayRedirectHtml();
    if (!html) {
      setMissingPayload(true);
      return;
    }

    const submitted = submitGatewayRedirectHtml(html);
    if (submitted) {
      return;
    }

    document.open();
    document.write(html);
    document.close();
  }, []);

  if (missingPayload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md rounded-3xl border bg-background p-8 text-center shadow-xl">
          <h1 className="font-headline text-2xl font-bold">Secure Verification Session Missing</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The bank verification payload is no longer available in this tab. Start the payment again to reopen the secure challenge.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href="/store">Return to Store</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-3xl border bg-background p-8 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Smile Pay</p>
        <h1 className="mt-3 font-headline text-3xl font-bold">Opening Bank Verification</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We are handing you off to your bank&apos;s 3D Secure page now. If nothing happens within a few seconds, go back and restart the payment.
        </p>
      </div>
    </main>
  );
}
