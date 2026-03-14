import Link from "next/link";
import { Eye, Search, Truck, AlertTriangle, ClipboardList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listOrders } from "@/lib/firestore/orders";
import { listShipments } from "@/lib/firestore/shipments";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-ZW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function AdminShipmentsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const query = firstParam(params.q)?.trim().toLowerCase() ?? "";
  const status = firstParam(params.status) ?? "all";

  const [shipments, orders] = await Promise.all([listShipments(), listOrders()]);
  const orderMap = new Map(orders.map(order => [order.id, order]));

  const rows = shipments
    .map(shipment => ({
      shipment,
      order: orderMap.get(shipment.orderReference),
    }))
    .filter(({ shipment, order }) => {
      const haystack = [
        shipment.orderReference,
        shipment.zoneName,
        shipment.courierName,
        order?.customerName,
        order?.customerEmail,
        order?.customerPhone,
        order?.customerAddress,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (status !== "all" && shipment.status !== status) return false;
      return true;
    });

  const deliveryShipments = shipments.filter(item => item.deliveryMethod === "delivery");
  const unassignedDelivery = deliveryShipments.filter(item => !item.courierName).length;
  const readyToDispatch = shipments.filter(item => item.status === "ready_for_dispatch").length;
  const onTheRoad = shipments.filter(item => item.status === "out_for_delivery").length;
  const deliveryIssues = shipments.filter(item => item.status === "issue").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Dispatch & Shipments</h2>
        <p className="text-sm text-muted-foreground">
          Operational view of courier assignment, dispatch readiness, delivery progress, and proof-of-delivery capture.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unassigned delivery</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{unassignedDelivery}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ready for dispatch</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{readyToDispatch}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Out for delivery</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{onTheRoad}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivery issues</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{deliveryIssues}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search by order, customer, courier, or zone and narrow by shipment status.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" method="get">
            <div className="relative md:col-span-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={query} placeholder="Search shipment, customer, courier, or address..." className="pl-9" />
            </div>
            <select name="status" defaultValue={status} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All shipment statuses</option>
              <option value="awaiting_payment">Awaiting payment</option>
              <option value="pickup_pending">Pickup pending</option>
              <option value="ready_for_dispatch">Ready for dispatch</option>
              <option value="out_for_delivery">Out for delivery</option>
              <option value="delivered">Delivered</option>
              <option value="collected">Collected</option>
              <option value="issue">Issue</option>
            </select>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit">Apply Filters</Button>
              <Button variant="outline" asChild>
                <Link href="/admin/shipments">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shipment</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Courier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ shipment, order }) => (
              <TableRow key={shipment.id}>
                <TableCell>
                  <div className="font-medium">{shipment.orderReference}</div>
                  <div className="text-xs text-muted-foreground capitalize">{shipment.deliveryMethod}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{order?.customerName ?? "Unknown customer"}</div>
                  <div className="text-xs text-muted-foreground">{order?.customerEmail ?? "No email"}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{shipment.zoneName ?? "No zone"}</div>
                  <div className="text-xs text-muted-foreground">
                    {order?.shipping?.address ?? order?.customerAddress ?? "No address recorded"}
                  </div>
                </TableCell>
                <TableCell>
                  {shipment.courierName ? (
                    <div>
                      <div className="font-medium">{shipment.courierName}</div>
                      <div className="text-xs text-muted-foreground">{shipment.courierPhone ?? "No courier phone"}</div>
                    </div>
                  ) : (
                    <Badge variant="outline">Unassigned</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      shipment.status === "issue"
                        ? "destructive"
                        : shipment.status === "delivered" || shipment.status === "collected"
                          ? "secondary"
                          : "outline"
                    }
                    className="capitalize"
                  >
                    {shipment.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(shipment.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/orders/${shipment.orderReference}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      Open order
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No shipments found for the current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <CardTitle>Dispatch checklist</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Assign courier before moving a delivery order to out for delivery.</div>
            <div>Capture proof of delivery URL for completed drop-offs.</div>
            <div>Use issue status for failed drops, damaged goods, or customer no-shows.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <CardTitle>Dispatch focus</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>{readyToDispatch} shipment(s) are ready for dispatch right now.</div>
            <div>{onTheRoad} shipment(s) are currently out for delivery.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <CardTitle>Attention needed</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>{unassignedDelivery} delivery shipment(s) still need courier assignment.</div>
            <div>{deliveryIssues} shipment(s) are currently marked with delivery issues.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
