import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowUpRight, CreditCard, RefreshCcw, ShieldAlert, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { listOrders } from "@/lib/firestore/orders";
import { getPaymentOpsSummary } from "@/lib/firestore/payments";
import { listShipments } from "@/lib/firestore/shipments";

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-ZW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatUsd(value?: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

export default async function AdminPaymentsPage() {
  const [orders, shipments] = await Promise.all([listOrders(), listShipments()]);
  const { summary, reconciliationRows, intents, webhooks, events } = await getPaymentOpsSummary(orders);
  const paidAwaitingDispatch = orders.filter(order =>
    order.status === "processing"
    && order.shipping?.deliveryMethod === "delivery"
    && ["awaiting_payment", "ready_for_dispatch"].includes(order.shipping?.status ?? ""),
  ).length;
  const unassignedPaidShipments = shipments.filter(shipment =>
    shipment.deliveryMethod === "delivery"
    && ["ready_for_dispatch", "out_for_delivery"].includes(shipment.status)
    && !shipment.courierName,
  ).length;

  const statCards = [
    { title: "Payment intents", value: String(summary.totalIntents), description: `${summary.paidIntents} paid • ${summary.pendingIntents} pending`, icon: CreditCard },
    { title: "Processing", value: String(summary.processingIntents), description: `${summary.failedIntents} failed/cancelled`, icon: RefreshCcw },
    { title: "Webhook inbox", value: String(summary.receivedWebhooks), description: `${summary.failedWebhooks} failed processors`, icon: Wallet },
    { title: "Reconciliation alerts", value: String(summary.reconciliationAlerts), description: "Order and payment states need review", icon: ShieldAlert },
    { title: "Paid awaiting dispatch", value: String(paidAwaitingDispatch), description: `${unassignedPaidShipments} unassigned delivery runs`, icon: Truck },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Payments & Reconciliation</h2>
        <p className="text-sm text-muted-foreground">Live view of payment intents, webhook processing, and order-state mismatches.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map(stat => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fulfilment follow-through</CardTitle>
          <CardDescription>Orders that are financially clear but still need dispatch action.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Paid orders waiting on dispatch readiness</div>
            <div className="text-2xl font-bold">{paidAwaitingDispatch}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Delivery shipments missing courier assignment</div>
            <div className="text-2xl font-bold">{unassignedPaidShipments}</div>
          </div>
          <Link href="/admin/shipments" className="inline-flex items-center text-sm font-medium text-primary">
            Open dispatch board <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Reconciliation alerts</CardTitle>
            <CardDescription>Orders whose current order status does not line up with the latest tracked payment intent.</CardDescription>
          </CardHeader>
          <CardContent>
            {reconciliationRows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No reconciliation mismatches detected.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Order status</TableHead>
                    <TableHead>Intent status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliationRows.map(({ order, intent }) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">{order.id}</div>
                        <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{order.status}</Badge></TableCell>
                      <TableCell>
                        {intent ? <Badge variant="secondary" className="capitalize">{intent.status.replace(/_/g, " ")}</Badge> : <Badge variant="destructive">Missing intent</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{formatUsd(order.totalUsd ?? order.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Webhook failures</CardTitle>
            <CardDescription>Webhook records that were received but not processed cleanly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {webhooks.filter(webhook => webhook.status === "failed").slice(0, 8).map(webhook => (
              <div key={webhook.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{webhook.provider.toUpperCase()}</span>
                  <Badge variant="destructive">failed</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{formatDate(webhook.receivedAt)}</div>
                <div className="mt-2 text-xs text-muted-foreground">{webhook.error || "Processor error recorded without message."}</div>
              </div>
            ))}
            {webhooks.filter(webhook => webhook.status === "failed").length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No failed webhook processors.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent payment intents</CardTitle>
            <CardDescription>Latest tracked gateway submissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intents.slice(0, 12).map(intent => (
                  <TableRow key={intent.id}>
                    <TableCell>
                      <div className="font-medium">{intent.orderReference}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(intent.updatedAt)}</div>
                    </TableCell>
                    <TableCell className="uppercase">{intent.paymentMethod}</TableCell>
                    <TableCell><Badge variant={intent.status === "paid" ? "secondary" : intent.status === "failed" || intent.status === "cancelled" ? "destructive" : "outline"} className="capitalize">{intent.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-right">{formatUsd(intent.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent gateway events</CardTitle>
            <CardDescription>Latest normalized payment events applied to orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.slice(0, 12).map(event => (
                <div key={event.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{event.reference}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</div>
                    </div>
                    <Badge variant="outline" className="uppercase">{event.status}</Badge>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No payment events recorded yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {summary.reconciliationAlerts > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Manual review recommended</CardTitle>
            </div>
            <CardDescription className="text-yellow-700">
              Some orders and payment intents are out of sync. Review the alerts above before dispatching goods or closing refund cases.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
