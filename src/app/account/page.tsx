import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getOrderDocumentState } from "@/lib/order-documents";
import { formatTokenGroups } from "@/lib/token-format";
import { verifyCustomerSession } from "@/lib/auth";
import { getCustomerAccountSnapshot } from "@/lib/firestore/customers";
import { AccountLogoutButton, RefundRequestCard } from "./account-client";
import { CurrencyAmount } from "@/components/currency/currency-amount";

export const metadata = {
  title: "My Account | Valley Farm Secrets",
  description: "Review orders, receipts, saved addresses, and refunds.",
};

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-ZW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AccountPage() {
  const session = await verifyCustomerSession();
  if (!session?.email) {
    redirect("/account/login");
  }

  const snapshot = await getCustomerAccountSnapshot(session.email);
  if (!snapshot) {
    redirect("/account/login");
  }

  const { profile, orders, digitalOrders, refunds, engagements } = snapshot;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 bg-muted/10">
        <section className="container mx-auto space-y-6 px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-col gap-4 rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 shadow-sm md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary">Customer account</Badge>
              <h1 className="font-headline text-3xl font-bold">{profile.name}</h1>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <p className="text-sm text-muted-foreground">{profile.phone ?? "No phone on file"}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/store"><Button>Continue shopping</Button></Link>
              <AccountLogoutButton />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard title="Orders" value={String(profile.orderCount)} detail={profile.lastOrderAt ? `Last order ${formatDate(profile.lastOrderAt)}` : "No orders yet"} />
            <MetricCard title="Spend" value={<CurrencyAmount amount={profile.totalSpent} />} detail="Displayed in your selected currency" />
            <MetricCard title="Refund cases" value={String(profile.openRefundCaseCount)} detail={profile.lastPaymentIssueAt ? `Latest issue ${formatDate(profile.lastPaymentIssueAt)}` : "No active payment issues"} />
            <MetricCard title="Saved addresses" value={String(profile.savedAddressCount)} detail={profile.preferredDeliveryMethod ? `Preferred ${profile.preferredDeliveryMethod}` : "No default delivery preference"} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Recent orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders available for this account yet.</p>
                ) : orders.map(order => {
                  const linkedDigitalOrder = digitalOrders.find(digitalOrder => digitalOrder.orderReference === order.id);
                  const isSuccessfulDigitalOrder = linkedDigitalOrder?.provisioningStatus === "completed";
                  const hasRefundCase = refunds.some(refund => refund.orderReference === order.id && !["closed", "rejected"].includes(refund.status));
                  const orderRefunds = refunds.filter(refund => refund.orderReference === order.id);
                  const documentState = getOrderDocumentState({
                    order,
                    refunds: orderRefunds,
                    digitalProvisioningStatus: linkedDigitalOrder?.provisioningStatus,
                  });
                  return (
                  <div key={order.id} className="rounded-2xl border p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-semibold">{order.id}</div>
                        <div className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{order.status}</Badge>
                        <Badge variant="secondary">{order.shipping?.status ?? "awaiting_payment"}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                      <span>{order.items.length} item(s) via {order.paymentMethod?.toUpperCase() ?? "payment"}</span>
                      <CurrencyAmount
                        amount={order.totalUsd ?? order.total}
                        sourceCurrencyCode={typeof order.totalUsd === "number" ? "840" : (order.currencyCode === "924" ? "924" : "840")}
                        className="font-medium text-foreground"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3">
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
                      {!isSuccessfulDigitalOrder ? (
                        <RefundRequestCard
                          orderReference={order.id}
                          existingRefund={hasRefundCase}
                          disabled={order.status === "pending"}
                        />
                      ) : null}
                    </div>
                  </div>
                )})}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Digital purchases</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {digitalOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No digital purchases linked to this account yet.</p>
                  ) : digitalOrders.map(order => (
                    <div key={order.id} className="rounded-2xl border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold uppercase">{order.serviceId}</span>
                        <Badge variant="outline">{order.provisioningStatus}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">Account: {order.accountReference}</p>
                      {order.token ? <p className="mt-1 whitespace-pre-line break-all font-mono text-xs">Token: {formatTokenGroups(order.token)}</p> : null}
                      {order.receiptNumber ? <p className="mt-1 text-muted-foreground">Receipt: {order.receiptNumber}</p> : null}
                      <div className="mt-3">
                        <Link href={`/account/digital/${encodeURIComponent(order.orderReference)}`}>
                          <Button size="sm" variant="outline">Open detail</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Saved delivery addresses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile.shippingAddresses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
                  ) : profile.shippingAddresses.map(address => (
                    <div key={`${address.label}-${address.address}`} className="rounded-2xl border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{address.label}</span>
                        {address.isDefault ? <Badge>Default</Badge> : null}
                      </div>
                      <p className="mt-1 text-muted-foreground">{address.address}</p>
                      {address.instructions ? <p className="mt-1 text-muted-foreground">{address.instructions}</p> : null}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Refunds and payment issues</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {refunds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No refund cases linked to this account.</p>
                  ) : refunds.map(refund => (
                    <div key={refund.id} className="rounded-2xl border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{refund.orderReference}</span>
                        <Badge variant="outline">{refund.status}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">Reason: {refund.reason.replace(/_/g, " ")}</p>
                      <p className="mt-1 text-muted-foreground">
                        Amount:{" "}
                        <CurrencyAmount
                          amount={refund.amountUsd ?? refund.amount}
                          sourceCurrencyCode={typeof refund.amountUsd === "number" ? "840" : (refund.currencyCode === "924" ? "924" : "840")}
                        />
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {engagements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity has been recorded yet.</p>
              ) : engagements.slice(0, 12).map((engagement, index) => (
                <div key={engagement.id}>
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{engagement.title}</p>
                      <p className="text-sm text-muted-foreground">{engagement.detail ?? engagement.type}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(engagement.createdAt)}</span>
                  </div>
                  {index < Math.min(engagements.length, 12) - 1 ? <Separator className="mt-3" /> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function MetricCard({ title, value, detail }: { title: string; value: ReactNode; detail: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
