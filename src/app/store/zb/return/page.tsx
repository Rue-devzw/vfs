import Link from "next/link";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function normalize(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ZbReturnPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const reference = normalize(params.reference) || "";
  const forcedStatus = normalize(params.status);

  let status = forcedStatus || "PENDING";
  if (reference && !forcedStatus) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/zb/status/${encodeURIComponent(reference)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (data?.data?.status) {
        status = data.data.status;
      }
    } catch {
      status = "PENDING";
    }
  }

  const normalized = status.toUpperCase();
  const isSuccess = normalized === "PAID" || normalized === "SUCCESS";
  const message = isSuccess
    ? "Your payment was received successfully."
    : normalized === "FAILED"
      ? "Your payment failed. Please try again."
      : normalized === "CANCELED"
        ? "Your payment was canceled."
        : "Your payment is still processing.";

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-headline text-3xl font-bold">Payment Update</h1>
      <p className="text-muted-foreground">{message}</p>
      {reference ? <p className="text-xs text-muted-foreground">Reference: {reference}</p> : null}
      <div className="mt-4 flex gap-3">
        <Button asChild>
          <Link href="/store">Back to Store</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/orders">View Orders</Link>
        </Button>
      </div>
    </main>
  );
}
