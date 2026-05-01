import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyAmount } from "@/components/currency/currency-amount";
import { verifyCustomerSession } from "@/lib/auth";
import { getDigitalServiceConfig } from "@/lib/digital-services";
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

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function formatStatus(status: string) {
  switch (status) {
    case "completed":
      return "Completed";
    case "failed":
      return "Unsuccessful";
    case "processing":
      return "Processing";
    case "pending":
      return "Pending";
    default:
      return status.replace(/_/g, " ");
  }
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
  const serviceConfig = getDigitalServiceConfig(digitalOrder.serviceId);
  const resultPayload = asRecord(digitalOrder.resultPayload);
  const paymentDetails = asRecord(resultPayload.payment);
  const serviceMeta = asRecord(resultPayload.serviceMeta);
  const parsedReceipt = asRecord(resultPayload.parsedReceipt);
  const validationSnapshot = asRecord(digitalOrder.validationSnapshot);
  const validationParsed = asRecord(validationSnapshot.parsed);
  const serviceName = serviceConfig?.label ?? digitalOrder.serviceId.toUpperCase();
  const accountLabel = serviceConfig?.accountLabel ?? "Account Reference";
  const customerName = asText(paymentDetails.customerName) || asText(serviceMeta.accountName) || order.customerName;
  const packageName = asText(serviceMeta.bouquet) || asText(serviceMeta.packageName) || asText(paymentDetails.customerPaymentDetails1);
  const paymentType = digitalOrder.serviceId === "cimas"
    ? undefined
    : asText(serviceMeta.paymentType) || asText(paymentDetails.dstvPaymentType) || asText(paymentDetails.paymentType);
  const months = asText(serviceMeta.months) || asText(paymentDetails.months);
  const cimasReferenceType = digitalOrder.serviceId === "cimas"
    ? asText(paymentDetails.customerPaymentDetails2) || asText(parsedReceipt.customerPaymentDetails2) || asText(serviceMeta.referenceType)
    : undefined;
  const cimasProduct = digitalOrder.serviceId === "cimas"
    ? asText(validationParsed.currentProduct)
    : undefined;
  const detailRows = [
    { label: accountLabel, value: digitalOrder.accountReference },
    customerName ? { label: "Customer", value: customerName } : null,
    cimasReferenceType ? { label: "Reference Type", value: cimasReferenceType === "M" ? "Member" : cimasReferenceType === "E" ? "Payer" : cimasReferenceType } : null,
    cimasProduct ? { label: "Current Product", value: cimasProduct } : null,
    packageName ? { label: "Package", value: packageName } : null,
    paymentType ? { label: "Payment Type", value: paymentType.replace(/_/g, " ") } : null,
    months ? { label: "Months", value: months } : null,
    digitalOrder.receiptNumber ? { label: "Receipt Number", value: digitalOrder.receiptNumber } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));

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
              <h1 className="mt-2 text-3xl font-bold">Digital Purchase Details</h1>
              <p className="text-sm text-muted-foreground">
                Purchase reference {digitalOrder.orderReference} • Updated {formatDate(digitalOrder.updatedAt)}
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
                <CardTitle>Purchase status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={digitalOrder.provisioningStatus === "completed" ? "secondary" : digitalOrder.provisioningStatus === "failed" ? "destructive" : "outline"}>
                    {formatStatus(digitalOrder.provisioningStatus)}
                  </Badge>
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground">Service</div>
                    <div className="font-medium">{serviceName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{accountLabel}</div>
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

                {!digitalOrder.token && digitalOrder.provisioningStatus === "failed" ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    This purchase could not be completed. Please contact support with your purchase reference if you need help.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Purchase Reference</div>
                    <div className="font-medium">{order.id}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Payment Status</div>
                    <div className="font-medium">{documentState.statusLabel}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Amount</div>
                    <CurrencyAmount
                      amount={order.totalUsd ?? order.total}
                      sourceCurrencyCode={typeof order.totalUsd === "number" ? "840" : (order.currencyCode === "924" ? "924" : "840")}
                      className="font-medium text-foreground"
                    />
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

              {detailRows.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Purchase details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {detailRows.map((row) => (
                      <div key={row.label}>
                        <div className="text-muted-foreground">{row.label}</div>
                        <div className="font-medium">{row.value}</div>
                      </div>
                    ))}
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
