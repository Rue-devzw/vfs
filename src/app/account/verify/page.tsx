import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { VerifyClient } from "./verify-client";

export default function AccountVerifyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center bg-muted/10 px-4 py-10">
        <Suspense fallback={<div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">Loading verification status...</div>}>
          <VerifyClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
