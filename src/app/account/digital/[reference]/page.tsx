import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyCustomerSession } from "@/lib/auth";
import { getDigitalOrderByReference } from "@/lib/firestore/digital-orders";
import { getOrderDocumentState } from "@/lib/order-documents";
import { formatTokenGroups } from "@/lib/token-format";
import { getOrder } from "@/server/orders";
import { CopyTokenButton } from "./detail-client";

type PageProps = {
  params: Promise<{ reference: string }>;
};

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-ZW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AccountDigitalOrderPage({ params }: PageProps) {
  const session = await verifyCustomerSession();
  if (!session?.email) {
    redirect("/account/login");
  }

  const { reference } = await params;
  const orderReference = decodeURIComponent(reference);
  const [digitalOrder, order] = await Promise.all([
    getDigitalOrderByReference(orderReference),
    getOrder(orderReference),
  ]);

  if (!digitalOrder || !order) {
    notFound();
  }

  if (digitalOrder.customerEmail?.toLowerCase() !== session.email.toLowerCase()) {
    redirect("/account");
  }

  const documentState = getOrderDocumentState({
    order,
    digitalProvisioningStatus: digitalOrder.provisioningStatus,
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 bg-muted/10">
        <section className="container mx-auto space-y-6 px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Digital order</Badge>
                <Badge variant="outline" className="uppercase">{digitalOrder.serviceId}</Badge>
              </div>
              <h1 className="mt-2 text-3xl font-bold">Digital Purchase Detail</h1>
              <p className="text-sm text-muted-foreground">
                Reference {digitalOrder.orderReference} • Updated {formatDate(digitalOrder.updatedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/account"><Button variant="outline">Back to account</Button></Link>
              <Link href={`/api/orders/${encodeURIComponent(orderReference)}/report?format=invoice-pdf`} target="_blank">
                <Button>Invoice PDF</Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Fulfilment status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={digitalOrder.provisioningStatus === "completed" ? "secondary" : digitalOrder.provisioningStatus === "manual_review" || digitalOrder.provisioningStatus === "failed" ? "destructive" : "outline"}>
                    {digitalOrder.provisioningStatus}
                  </Badge>
                  <Badge variant="outline">{digitalOrder.provider}</Badge>
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground">Service</div>
                    <div className="font-medium uppercase">{digitalOrder.serviceId}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Account Reference</div>
                    <div className="font-medium">{digitalOrder.accountReference}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Created</div>
                    <div className="font-medium">{formatDate(digitalOrder.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Completed</div>
                    <div className="font-medium">{formatDate(digitalOrder.completedAt)}</div>
                  </div>
                </div>

                {digitalOrder.token ? (
                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <div className="text-sm text-muted-foreground">Token</div>
                    <div className="mt-2 whitespace-pre-line break-all font-mono text-lg font-semibold">{formatTokenGroups(digitalOrder.token)}</div>
                    <div className="mt-3">
                      <CopyTokenButton token={formatTokenGroups(digitalOrder.token)} />
                    </div>
                  </div>
                ) : null}

                {digitalOrder.receiptNumber ? (
                  <div className="rounded-2xl border p-4">
                    <div className="text-sm text-muted-foreground">Receipt Number</div>
                    <div className="mt-1 font-medium">{digitalOrder.receiptNumber}</div>
                  </div>
                ) : null}

                {!digitalOrder.token && (digitalOrder.provisioningStatus === "manual_review" || digitalOrder.provisioningStatus === "failed") ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    This purchase needs manual review. Support has the provider response and can continue investigating from the admin digital operations console.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Commerce order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Order Reference</div>
                    <div className="font-medium">{order.id}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Payment Status</div>
                    <div className="font-medium">{documentState.statusLabel}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Customer</div>
                    <div className="font-medium">{order.customerName}</div>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-2">
                    {documentState.kind === "receipt" ? (
                      <Link href={`/api/orders/${encodeURIComponent(order.id)}/report?format=pdf`} target="_blank">
                        <Button size="sm" variant="outline">Receipt PDF</Button>
                      </Link>
                    ) : documentState.kind === "report" ? (
                      <Link href={`/api/orders/${encodeURIComponent(order.id)}/report?format=report-pdf`} target="_blank">
                        <Button size="sm" variant="outline">Issue Report PDF</Button>
                      </Link>
                    ) : null}
                    <Link href={`/api/orders/${encodeURIComponent(order.id)}/report?format=invoice-pdf`} target="_blank">
                      <Button size="sm" variant="outline">Invoice PDF</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {digitalOrder.resultPayload ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Provider details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="max-h-96 overflow-auto rounded-xl border bg-muted p-3 text-xs">
                      {JSON.stringify(digitalOrder.resultPayload, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
