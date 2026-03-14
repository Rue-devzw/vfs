import { listOrders, listRefundCases } from "@/lib/firestore/orders";
import { getRefundOpsSummary } from "@/lib/firestore/refunds";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Search, Clock, CheckCircle2, XCircle, AlertTriangle, LoaderCircle, Download } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const query = firstParam(params.q)?.trim().toLowerCase() ?? "";
  const status = firstParam(params.status) ?? "all";

  const [orders, refundCases, refundOps] = await Promise.all([listOrders(), listRefundCases(), getRefundOpsSummary()]);
  const filteredOrders = orders.filter(order => {
    const haystack = [order.id, order.customerName, order.customerEmail, order.customerPhone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (query && !haystack.includes(query)) return false;
    if (status !== "all" && order.status !== status) return false;
    return true;
  });

  const pendingCount = orders.filter(order => order.status === "pending").length;
  const processingCount = orders.filter(order => order.status === "processing").length;
  const deliveredCount = orders.filter(order => order.status === "delivered").length;
  const cancelledCount = orders.filter(order => order.status === "cancelled").length;
  const openRefundCount = refundCases.filter(refund => !["closed", "rejected"].includes(refund.status)).length;
  const queuedRefundCount = refundOps.queued + refundOps.submitted + refundOps.manualReview + refundOps.failed;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Transactions & Orders</h2>
          <p className="text-sm text-muted-foreground">Track checkout completion, payment status, and fulfilment progress.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/api/admin/orders/export">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{pendingCount}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Processing</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{processingCount}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Delivered</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{deliveredCount}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cancelled</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{cancelledCount}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Open Refunds</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{openRefundCount}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Refund Ops Queue</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{queuedRefundCount}</CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search by order reference, customer details, or workflow status.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" method="get">
            <div className="relative md:col-span-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={query} placeholder="Search orders by customer, ID, email, or phone..." className="pl-9" />
            </div>
            <select name="status" defaultValue={status} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit">Apply Filters</Button>
              <Button variant="outline" asChild>
                <Link href="/admin/orders">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fulfilment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map(order => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.id}</TableCell>
                <TableCell>
                  <div className="font-medium">{order.customerName}</div>
                  <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"}
                </TableCell>
                <TableCell className="font-semibold">{formatMoney(order.totalUsd ?? order.total ?? 0)}</TableCell>
                <TableCell className="text-xs text-muted-foreground uppercase">
                  {order.paymentMethod || "Unknown"}
                </TableCell>
                <TableCell>
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      order.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : order.status === "processing"
                          ? "bg-blue-100 text-blue-800"
                          : order.status === "delivered"
                            ? "bg-green-100 text-green-800"
                            : order.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {order.status === "pending" ? <Clock className="h-3 w-3" /> : null}
                    {order.status === "processing" ? <LoaderCircle className="h-3 w-3" /> : null}
                    {order.status === "delivered" ? <CheckCircle2 className="h-3 w-3" /> : null}
                    {order.status === "cancelled" ? <XCircle className="h-3 w-3" /> : null}
                    {order.status === "shipped" ? <AlertTriangle className="h-3 w-3" /> : null}
                    <span className="capitalize">{order.status}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {order.shipping ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800 capitalize">
                      {order.shipping.status.replace(/_/g, " ")}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/orders/${order.id}`}>
                      <Eye className="mr-2 h-4 w-4" /> View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No orders found for the current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
