import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Package, ShoppingCart, Users, AlertTriangle, ArrowUpRight, ReceiptText, Bell, Zap, Undo2, ShieldCheck, Activity } from "lucide-react";
import Link from "next/link";
import { listProducts, listCategories } from "@/lib/firestore/products";
import { listOrders } from "@/lib/firestore/orders";
import { listCustomers } from "@/lib/firestore/customers";
import { getPaymentOpsSummary } from "@/lib/firestore/payments";
import { getNotificationOpsSummary } from "@/lib/firestore/notifications";
import { listDigitalOrders } from "@/lib/firestore/digital-orders";
import { getRefundOpsSummary } from "@/lib/firestore/refunds";
import { getReconciliationWorkspace, listReconciliationBatches } from "@/lib/firestore/reconciliation";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function notificationsNeedAttention(summary: { queued: number; failed: number }) {
  return summary.queued + summary.failed;
}

export default async function AdminDashboardPage() {
  const [{ items: products, source: productSource }, categoriesResult, orders, customers] = await Promise.all([
    listProducts(),
    listCategories(),
    listOrders(),
    listCustomers(),
  ]);
  const [paymentOps, notificationOps, digitalOrders, refundOps, reconciliation, batches] = await Promise.all([
    getPaymentOpsSummary(orders),
    getNotificationOpsSummary(),
    listDigitalOrders(),
    getRefundOpsSummary(),
    getReconciliationWorkspace(),
    listReconciliationBatches(5),
  ]);

  const totalRevenue = orders.reduce((sum, order) => sum + (order.totalUsd ?? order.total ?? 0), 0);
  const pendingOrders = orders.filter(order => order.status === "pending").length;
  const processingOrders = orders.filter(order => order.status === "processing").length;
  const deliveredOrders = orders.filter(order => order.status === "delivered").length;
  const cancelledOrders = orders.filter(order => order.status === "cancelled").length;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const rollingRevenue = orders
    .filter(order => Date.parse(order.createdAt) >= sevenDaysAgo)
    .reduce((sum, order) => sum + (order.totalUsd ?? order.total ?? 0), 0);
  const onSpecialProducts = products.filter(product => product.onSpecial).length;
  const unavailableProducts = products.filter(product => !product.availableForSale).length;
  const activeCustomers = customers.filter(customer => customer.orderCount > 0).length;
  const recentOrders = orders.slice(0, 6);
  const agedNotificationBacklog = notificationsNeedAttention(notificationOps.summary);
  const digitalManualReviewAged = digitalOrders.filter(order =>
    order.provisioningStatus === "manual_review"
    && Date.now() - Date.parse(order.updatedAt) > 30 * 60 * 1000,
  ).length;
  const topCategories = categoriesResult.categories
    .slice()
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 6);

  const statCards = [
    {
      title: "Revenue",
      value: formatMoney(totalRevenue),
      description: `${orders.length} orders • 7-day ${formatMoney(rollingRevenue)}`,
      icon: DollarSign,
      color: "text-emerald-500",
      bgClass: "from-emerald-500/10 to-transparent",
    },
    {
      title: "Orders Pipeline",
      value: `${pendingOrders + processingOrders}`,
      description: `${pendingOrders} pending • ${processingOrders} processing`,
      icon: ShoppingCart,
      color: "text-blue-500",
      bgClass: "from-blue-500/10 to-transparent",
    },
    {
      title: "Catalog",
      value: `${products.length}`,
      description: `${onSpecialProducts} on special • ${unavailableProducts} unavailable`,
      icon: Package,
      color: "text-indigo-500",
      bgClass: "from-indigo-500/10 to-transparent",
    },
    {
      title: "Customers",
      value: `${activeCustomers}`,
      description: `${customers.length} known profiles`,
      icon: Users,
      color: "text-violet-500",
      bgClass: "from-violet-500/10 to-transparent",
    },
    {
      title: "Payments",
      value: `${paymentOps.summary.totalIntents}`,
      description: `${paymentOps.summary.reconciliationAlerts} alerts • ${paymentOps.summary.failedWebhooks} webhook fails`,
      icon: ReceiptText,
      color: "text-rose-500",
      bgClass: "from-rose-500/10 to-transparent",
    },
    {
      title: "Notifications",
      value: `${notificationOps.summary.total}`,
      description: `${notificationOps.summary.queued} queued • ${agedNotificationBacklog} attention`,
      icon: Bell,
      color: "text-amber-500",
      bgClass: "from-amber-500/10 to-transparent",
    },
    {
      title: "Digital Ops",
      value: `${digitalOrders.length}`,
      description: `${digitalOrders.filter(order => order.provisioningStatus === "manual_review").length} review • ${digitalManualReviewAged} aged`,
      icon: Zap,
      color: "text-cyan-500",
      bgClass: "from-cyan-500/10 to-transparent",
    },
    {
      title: "Controls",
      value: `${reconciliation.summary.totalExceptions}`,
      description: `${batches[0]?.status ?? "open"} batch • ${reconciliation.summary.inventoryVariances} variances`,
      icon: ShieldCheck,
      color: "text-fuchsia-500",
      bgClass: "from-fuchsia-500/10 to-transparent",
    },
    {
      title: "Refunds",
      value: `${refundOps.queued + refundOps.submitted + refundOps.manualReview + refundOps.failed}`,
      description: `${refundOps.agedQueued} aged • ${refundOps.completed} completed`,
      icon: Undo2,
      color: "text-orange-500",
      bgClass: "from-orange-500/10 to-transparent",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -top-10 -z-10 h-[200px] w-full rounded-2xl bg-gradient-to-r from-primary/5 via-primary/5 to-transparent blur-3xl" />
        <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
           <Activity className="h-7 w-7 text-primary" />
           Operations Overview
        </h2>
        <p className="text-sm font-medium text-muted-foreground">
          Live admin snapshot from {productSource === "firestore" ? "Firestore" : "static catalog"} and order activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {statCards.map((stat, i) => (
          <Card 
            key={stat.title}
            className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 animate-in fade-in slide-in-from-bottom-4 bg-background/60 backdrop-blur-sm"
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br opacity-50 ${stat.bgClass} z-0 transition-opacity duration-300 group-hover:opacity-100`} />
            <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold tracking-wide">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg bg-background/80 backdrop-blur-md shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${stat.color}`}>
                 <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-extrabold tracking-tighter">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 tracking-tight truncate">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3 transition-all hover:shadow-md h-full flex flex-col">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-lg">Order Health</CardTitle>
            <CardDescription>Status breakdown and delivery progression.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6 flex-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Pending", value: pendingOrders, tone: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                { label: "Processing", value: processingOrders, tone: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
                { label: "Delivered", value: deliveredOrders, tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
                { label: "Cancelled", value: cancelledOrders, tone: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
              ].map((item, i) => (
                <div 
                  key={item.label} 
                  className={`rounded-xl border ${item.tone} p-4 flex flex-col justify-between transition-transform hover:scale-105 duration-300 animate-in fade-in zoom-in-95`}
                  style={{ animationDelay: `${i * 75}ms`, animationFillMode: 'both' }}
                >
                  <div className="text-sm font-semibold opacity-80 uppercase tracking-widest">{item.label}</div>
                  <div className="mt-4 flex items-end justify-between">
                    <span className="text-3xl font-black tracking-tighter">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-muted-foreground">Network Delivery Completion Rate</span>
                    <span className="font-black text-lg">{orders.length ? `${Math.round((deliveredOrders / orders.length) * 100)}%` : "0%"}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-secondary overflow-hidden shadow-inner">
                    <div 
                       className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 ease-out" 
                       style={{ width: `${orders.length ? Math.round((deliveredOrders / orders.length) * 100) : 0}%` }}
                    />
                </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 transition-all hover:shadow-md h-full flex flex-col">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-lg">Action Items</CardTitle>
            <CardDescription>Metrics that may require attention.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-2 flex-1 overflow-auto max-h-[400px]">
             {[
               { label: "Unavailable products", desc: "Missing sellable price.", val: unavailableProducts, url: "/admin/products", crit: false },
               { label: "Promotions running", desc: "Products marked as specials.", val: onSpecialProducts, url: "/admin/products", crit: false },
               { label: "Customer coverage", desc: "Known active profiles.", val: activeCustomers, url: "/admin/customers", crit: false },
               { label: "Payment reconciliation", desc: "Mismatches & failed webhooks.", val: paymentOps.summary.reconciliationAlerts, url: "/admin/payments", crit: paymentOps.summary.reconciliationAlerts > 0 },
               { label: "Notification queue", desc: "Failed customer milestones.", val: agedNotificationBacklog, url: "/admin/notifications", crit: notificationOps.summary.failed > 0 },
               { label: "Daily close exceptions", desc: "Batch locking, stock variance.", val: reconciliation.summary.totalExceptions, url: "/admin/reconciliation", crit: reconciliation.summary.totalExceptions > 0 },
               { label: "Refund execution", desc: "Manual-review refunds.", val: refundOps.queued + refundOps.manualReview + refundOps.failed, url: "/admin/refunds", crit: refundOps.agedQueued > 0 || refundOps.failed > 0 },
               { label: "Digital SLA backlog", desc: "Manual reviews > 30 minutes.", val: digitalManualReviewAged, url: "/admin/digital", crit: digitalManualReviewAged > 0 },
             ].map((alert) => (
               <Link href={alert.url} key={alert.label} className="block">
                 <div 
                   className={`group flex items-center justify-between rounded-lg border border-transparent p-3 transition-colors hover:bg-muted/50 hover:border-border ${alert.crit ? "bg-red-500/5 hover:bg-red-500/10 border-red-500/10 hover:border-red-500/20" : ""}`}
                 >
                   <div>
                     <div className={`font-semibold text-sm flex items-center gap-2 transition-colors ${alert.crit ? 'text-red-700 dark:text-red-400' : 'group-hover:text-primary'}`}>
                        {alert.label}
                        <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                     </div>
                     <div className="text-xs text-muted-foreground">{alert.desc}</div>
                   </div>
                   <Badge variant={alert.crit ? "destructive" : "secondary"} className="ml-4 shrink-0 shadow-sm transition-transform group-hover:scale-110">
                     {alert.val}
                   </Badge>
                 </div>
               </Link>
             ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3 transition-all hover:shadow-md">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <CardDescription>Latest orders flowing through the system.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                <ShoppingCart className="h-10 w-10 mb-4 opacity-20" />
                No orders recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order, i) => (
                  <div 
                    key={order.id} 
                    className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border p-4 transition-all hover:border-primary/50 hover:shadow-sm"
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-2">
                        {order.customerName}
                        {order.status === "pending" && <span className="h-2 w-2 rounded-full bg-amber-500 animate-[pulse_1.5s_ease-in-out_infinite]" />}
                        {order.status === "processing" && <span className="h-2 w-2 rounded-full bg-blue-500 animate-[pulse_1.5s_ease-in-out_infinite]" />}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{order.customerEmail}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{order.items.length} items</span>
                      </div>
                      <div className="text-xs opacity-50">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString() : "No timestamp"}
                      </div>
                    </div>
                    <div className="text-left sm:text-right mt-3 sm:mt-0">
                      <div className="font-black text-lg">{formatMoney(order.totalUsd ?? order.total ?? 0)}</div>
                      <Badge variant={order.status === "delivered" ? "default" : "secondary"} className={`mt-1 capitalize tracking-wide ${order.status === 'delivered' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 transition-all hover:shadow-md h-fit">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-lg">Category Distribution</CardTitle>
            <CardDescription>Product concentration metrics.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {topCategories.map(category => (
                <div key={category.name} className="relative overflow-hidden rounded-xl border p-4 transition-colors hover:bg-muted/30">
                  <div className="flex items-center justify-between relative z-10">
                    <div className="font-bold tracking-tight">{category.name}</div>
                    <Badge variant="outline" className="bg-background shadow-sm">{category.productCount} products</Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground relative z-10 flex items-center gap-2 font-medium">
                    <span className="text-amber-500">{category.onSpecialCount} on special</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span>{category.subcategories.length} subcategories</span>
                  </div>
                  {/* Subtle bar background indicator */}
                  <div 
                    className="absolute inset-y-0 left-0 bg-primary/5 transition-all duration-1000 -z-0"
                    style={{ width: `${Math.min(100, Math.max(5, (category.productCount / (categoriesResult.categories[0]?.productCount || 1)) * 100))}%` }}
                  />
                </div>
              ))}
              {topCategories.length === 0 && (
                <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground bg-muted/10 flex flex-col items-center">
                  <Package className="h-8 w-8 mb-3 opacity-20" />
                  No category data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {productSource !== "firestore" && (
        <Card className="border-amber-200 bg-amber-50/50 backdrop-blur shadow-sm animate-in fade-in">
          <CardHeader>
            <div className="flex items-center gap-3 text-amber-700">
              <div className="p-2 rounded-full bg-amber-100">
                 <AlertTriangle className="h-5 w-5" />
              </div>
              <CardTitle>Static Catalog Fallback Active</CardTitle>
            </div>
            <CardDescription className="text-amber-700/80 mt-1 pl-12 font-medium">
              Products are loading from the static JSON catalog because Firestore is not available for the catalog query.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
