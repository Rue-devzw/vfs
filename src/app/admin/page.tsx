import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Package, ShoppingCart, Users, AlertTriangle, ArrowUpRight, ReceiptText, Bell, Zap, Undo2 } from "lucide-react";
import Link from "next/link";
import { listProducts, listCategories } from "@/lib/firestore/products";
import { listOrders } from "@/lib/firestore/orders";
import { listCustomers } from "@/lib/firestore/customers";
import { getPaymentOpsSummary } from "@/lib/firestore/payments";
import { getNotificationOpsSummary } from "@/lib/firestore/notifications";
import { listDigitalOrders } from "@/lib/firestore/digital-orders";
import { getRefundOpsSummary } from "@/lib/firestore/refunds";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export default async function AdminDashboardPage() {
  const [{ items: products, source: productSource }, categoriesResult, orders, customers] = await Promise.all([
    listProducts(),
    listCategories(),
    listOrders(),
    listCustomers(),
  ]);
  const [paymentOps, notificationOps, digitalOrders, refundOps] = await Promise.all([
    getPaymentOpsSummary(orders),
    getNotificationOpsSummary(),
    listDigitalOrders(),
    getRefundOpsSummary(),
  ]);

  const totalRevenue = orders.reduce((sum, order) => sum + (order.totalUsd ?? order.total ?? 0), 0);
  const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;
  const pendingOrders = orders.filter(order => order.status === "pending").length;
  const processingOrders = orders.filter(order => order.status === "processing").length;
  const deliveredOrders = orders.filter(order => order.status === "delivered").length;
  const cancelledOrders = orders.filter(order => order.status === "cancelled").length;
  const onSpecialProducts = products.filter(product => product.onSpecial).length;
  const unavailableProducts = products.filter(product => !product.availableForSale).length;
  const activeCustomers = customers.filter(customer => customer.orderCount > 0).length;
  const recentOrders = orders.slice(0, 6);
  const topCategories = categoriesResult.categories
    .slice()
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 6);

  const statCards = [
    {
      title: "Revenue",
      value: formatMoney(totalRevenue),
      description: `${orders.length} orders • Avg ${formatMoney(averageOrderValue)}`,
      icon: DollarSign,
    },
    {
      title: "Orders Pipeline",
      value: `${pendingOrders + processingOrders}`,
      description: `${pendingOrders} pending • ${processingOrders} processing`,
      icon: ShoppingCart,
    },
    {
      title: "Catalog",
      value: `${products.length}`,
      description: `${onSpecialProducts} on special • ${unavailableProducts} unavailable`,
      icon: Package,
    },
    {
      title: "Customers",
      value: `${activeCustomers}`,
      description: `${customers.length} known customer profiles`,
      icon: Users,
    },
    {
      title: "Payments",
      value: `${paymentOps.summary.totalIntents}`,
      description: `${paymentOps.summary.reconciliationAlerts} alerts • ${paymentOps.summary.failedWebhooks} webhook failures`,
      icon: ReceiptText,
    },
    {
      title: "Notifications",
      value: `${notificationOps.summary.total}`,
      description: `${notificationOps.summary.queued} queued • ${notificationOps.summary.failed} failed`,
      icon: Bell,
    },
    {
      title: "Digital Ops",
      value: `${digitalOrders.length}`,
      description: `${digitalOrders.filter(order => order.provisioningStatus === "manual_review").length} manual review • ${digitalOrders.filter(order => order.provisioningStatus === "completed").length} completed`,
      icon: Zap,
    },
    {
      title: "Refund Ops",
      value: `${refundOps.queued + refundOps.submitted + refundOps.manualReview + refundOps.failed}`,
      description: `${refundOps.agedQueued} aged queued • ${refundOps.completed} completed`,
      icon: Undo2,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Operations Overview</h2>
        <p className="text-sm text-muted-foreground">
          Live admin snapshot from {productSource === "firestore" ? "Firestore" : "static catalog"} and order activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
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

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Order Health</CardTitle>
            <CardDescription>Status breakdown and delivery completion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                { label: "Pending", value: pendingOrders, tone: "bg-yellow-100 text-yellow-800" },
                { label: "Processing", value: processingOrders, tone: "bg-blue-100 text-blue-800" },
                { label: "Delivered", value: deliveredOrders, tone: "bg-green-100 text-green-800" },
                { label: "Cancelled", value: cancelledOrders, tone: "bg-red-100 text-red-800" },
              ].map(item => (
                <div key={item.label} className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-2xl font-semibold">{item.value}</span>
                    <Badge className={item.tone}>{item.label}</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Delivery completion rate:{" "}
              <span className="font-semibold text-foreground">
                {orders.length ? `${Math.round((deliveredOrders / orders.length) * 100)}%` : "0%"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Catalog Alerts</CardTitle>
            <CardDescription>Products and pricing that need admin attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium">Unavailable products</div>
                <div className="text-sm text-muted-foreground">Items priced at zero or missing sellable price.</div>
              </div>
              <Badge variant="secondary">{unavailableProducts}</Badge>
            </div>
            <div className="flex items-start justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium">Promotions running</div>
                <div className="text-sm text-muted-foreground">Products marked as specials in the storefront.</div>
              </div>
              <Badge variant="secondary">{onSpecialProducts}</Badge>
            </div>
            <div className="flex items-start justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium">Customer coverage</div>
                <div className="text-sm text-muted-foreground">Profiles with at least one recorded order.</div>
              </div>
              <Badge variant="secondary">{activeCustomers}</Badge>
            </div>
            <div className="flex items-start justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium">Payment reconciliation</div>
                <div className="text-sm text-muted-foreground">Order/payment mismatches and failed webhooks.</div>
              </div>
              <Badge variant={paymentOps.summary.reconciliationAlerts > 0 ? "destructive" : "secondary"}>
                {paymentOps.summary.reconciliationAlerts}
              </Badge>
            </div>
            <div className="flex items-start justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium">Notification queue</div>
                <div className="text-sm text-muted-foreground">Queued or failed customer milestone notifications.</div>
              </div>
              <Badge variant={notificationOps.summary.failed > 0 ? "destructive" : "secondary"}>
                {notificationOps.summary.queued + notificationOps.summary.failed}
              </Badge>
            </div>
            <div className="flex items-start justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium">Refund execution</div>
                <div className="text-sm text-muted-foreground">Queued, manual-review, and failed refund execution workload.</div>
              </div>
              <Badge variant={refundOps.agedQueued > 0 || refundOps.failed > 0 ? "destructive" : "secondary"}>
                {refundOps.queued + refundOps.manualReview + refundOps.failed}
              </Badge>
            </div>
            <Link href="/admin/products" className="inline-flex items-center text-sm font-medium text-primary">
              Review catalog <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
            <Link href="/admin/payments" className="inline-flex items-center text-sm font-medium text-primary">
              Open payments console <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
            <Link href="/admin/notifications" className="inline-flex items-center text-sm font-medium text-primary">
              Open notification console <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
            <Link href="/admin/digital" className="inline-flex items-center text-sm font-medium text-primary">
              Open digital ops <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
            <Link href="/admin/refunds" className="inline-flex items-center text-sm font-medium text-primary">
              Open refund ops <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest customer transactions and payment status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No orders recorded yet.
              </div>
            ) : (
              recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.customerEmail} • {order.items.length} items
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : "No timestamp"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatMoney(order.totalUsd ?? order.total ?? 0)}</div>
                    <Badge variant="secondary" className="mt-2 capitalize">
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
            <CardDescription>Where the catalog is currently concentrated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCategories.map(category => (
              <div key={category.name} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{category.name}</div>
                  <Badge variant="outline">{category.productCount}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {category.onSpecialCount} specials • {category.subcategories.length} subcategories
                </div>
              </div>
            ))}
            {topCategories.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No category data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {productSource !== "firestore" && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Static Catalog Fallback Active</CardTitle>
            </div>
            <CardDescription className="text-yellow-700">
              Products are loading from the static JSON catalog because Firestore is not available for the catalog query.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
