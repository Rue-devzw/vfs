"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcessStatusCard } from "@/components/ui/process-status-card";
import {
  getPaymentProgressContent,
  isFailedGatewayStatus,
  isSuccessfulGatewayStatus,
  normalizeGatewayStatus,
} from "@/lib/payment-flow";

type ReturnStatusProps = {
  reference: string;
  forcedStatus?: string;
};

type StatusSnapshot = {
  status: string;
  transactionReference?: string;
};

function buildReportMeta(status: string) {
  if (isSuccessfulGatewayStatus(status)) {
    return {
      label: "Download Receipt",
      format: "pdf",
    } as const;
  }

  if (isFailedGatewayStatus(status)) {
    return {
      label: "Open Issue Report",
      format: "report-pdf",
    } as const;
  }

  return {
    label: "Open Transaction Report",
    format: "invoice-pdf",
  } as const;
}

function buildFriendlyStatus(status: string) {
  if (isSuccessfulGatewayStatus(status)) return "Completed";
  if (isFailedGatewayStatus(status)) return "Issue Requires Attention";
  return "In Progress";
}

export function SmilePayReturnStatus({ reference, forcedStatus }: ReturnStatusProps) {
  const initialStatus = useMemo(
    () => normalizeGatewayStatus(forcedStatus),
    [forcedStatus],
  );
  const [snapshot, setSnapshot] = useState<StatusSnapshot>({
    status: initialStatus,
  });
  const [isPolling, setIsPolling] = useState(Boolean(reference));
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setIsPolling(false);
      return;
    }

    let cancelled = false;

    async function syncStatus() {
      const terminal = new Set(["PAID", "SUCCESS", "FAILED", "CANCELED", "CANCELLED", "EXPIRED"]);
      let latestStatus = normalizeGatewayStatus(forcedStatus);

      setIsPolling(true);
      setStatusError(null);

      for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
          const response = await fetch(`/api/payments/status/${encodeURIComponent(reference)}`, {
            cache: "no-store",
          });
          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || "Unable to refresh payment status.");
          }

          latestStatus = normalizeGatewayStatus(data.data?.status ?? latestStatus);
          if (cancelled) return;

          setSnapshot({
            status: latestStatus,
            transactionReference: typeof data.data?.transactionReference === "string"
              ? data.data.transactionReference
              : undefined,
          });

          if (terminal.has(latestStatus)) {
            break;
          }
        } catch (error) {
          if (cancelled) return;
          setStatusError(error instanceof Error ? error.message : "Unable to refresh payment status.");
          break;
        }

        await new Promise(resolve => window.setTimeout(resolve, 3000));
      }

      if (!cancelled) {
        setIsPolling(false);
      }
    }

    syncStatus();

    return () => {
      cancelled = true;
    };
  }, [forcedStatus, reference]);

  if (!reference) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center px-4">
        <Card className="w-full border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-7 w-7" />
            </div>
            <CardTitle className="font-headline">Missing Payment Reference</CardTitle>
            <CardDescription>
              This card return link does not include an order reference, so we cannot look up the payment result.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link href="/store">Back to Store</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  const normalizedStatus = snapshot.status;
  const progressCopy = getPaymentProgressContent(normalizedStatus, {
    paymentMethod: "CARD",
    subject: "your card payment",
    manualReview: true,
  });
  const report = buildReportMeta(normalizedStatus);
  const reportHref = `/api/orders/${encodeURIComponent(reference)}/report?format=${report.format}`;
  const showProcessingCard = isPolling && !isSuccessfulGatewayStatus(normalizedStatus) && !isFailedGatewayStatus(normalizedStatus);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-10">
      {showProcessingCard ? (
        <div className="w-full rounded-3xl border border-primary/10 bg-card p-6 shadow-sm">
          <ProcessStatusCard
            title={progressCopy.title}
            description={progressCopy.description}
            detail="We are checking Smile Pay for the latest card status and keeping your order reference ready in the meantime."
            progress={78}
          />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="flex-1">
              <a href={reportHref} target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" />
                {report.label}
              </a>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/store">Back to Store</Link>
            </Button>
          </div>
        </div>
      ) : (
        <Card className="w-full shadow-sm">
          <CardHeader className="items-center text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <CardTitle className="font-headline text-3xl">Payment Update</CardTitle>
            <CardDescription>{progressCopy.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Status</span>
                <span className="font-semibold">{buildFriendlyStatus(normalizedStatus)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Gateway Status</span>
                <span className="font-medium">{normalizedStatus}</span>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <span className="text-muted-foreground">Order Reference</span>
                <span className="font-mono text-right text-xs sm:text-sm">{reference.replace(/^order_/, "")}</span>
              </div>
              {snapshot.transactionReference ? (
                <div className="flex justify-between gap-4 py-2">
                  <span className="text-muted-foreground">Transaction Reference</span>
                  <span className="font-mono text-right text-xs sm:text-sm">{snapshot.transactionReference}</span>
                </div>
              ) : null}
            </div>

            {statusError ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
                {statusError}
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:flex-1">
              <a href={reportHref} target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" />
                {report.label}
              </a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:flex-1">
              <Link href="/store">
                Back to Store
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}
    </main>
  );
}
