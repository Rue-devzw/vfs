import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin, Wallet, Truck, AlertTriangle } from "lucide-react";
import { getCustomerProfileByEmail } from "@/lib/firestore/customers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default async function AdminCustomerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const email = decodeURIComponent(id).toLowerCase();
  const profile = await getCustomerProfileByEmail(email);

  if (!profile) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">Customer profile and engagement history</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Lifetime Spend</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(profile.totalSpent)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Orders</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{profile.orderCount}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Saved Addresses</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{profile.shippingAddresses.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Open Refund Cases</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{profile.openRefundCaseCount}</CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contact Profile</CardTitle>
            <CardDescription>Stored identity and preferred fulfilment details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {profile.email}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {profile.phone || "No phone on file"}</div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {profile.address || "No default address"}</div>
            <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" /> {profile.preferredDeliveryMethod ? `Prefers ${profile.preferredDeliveryMethod}` : "No preferred fulfilment set"}</div>
            <div className="flex flex-wrap gap-2 pt-2">
              {profile.paymentMethodsUsed.map(method => (
                <Badge key={method} variant="outline">{method}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping Addresses</CardTitle>
            <CardDescription>Reusable fulfilment locations for repeat orders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.shippingAddresses.length === 0 ? (
              <div className="text-sm text-muted-foreground">No saved shipping addresses.</div>
            ) : profile.shippingAddresses.map(address => (
              <div key={`${address.label}-${address.address}`} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{address.label}</div>
                  {address.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                </div>
                <div className="mt-1 text-muted-foreground">{address.address}</div>
                {address.instructions ? <div className="mt-2 text-xs text-muted-foreground">{address.instructions}</div> : null}
                {(address.recipientName || address.recipientPhone) ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Recipient: {address.recipientName || "Unknown"} {address.recipientPhone ? `• ${address.recipientPhone}` : ""}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Refund Watch</CardTitle>
            <CardDescription>Payment issues and refund investigations for this customer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.refunds.length === 0 ? (
              <div className="text-sm text-muted-foreground">No refund cases recorded.</div>
            ) : profile.refunds.map(refund => (
              <div key={refund.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{refund.orderReference}</div>
                  <Badge variant={refund.status === "refunded" ? "secondary" : "outline"} className="capitalize">
                    {refund.status}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  {formatMoney(refund.amountUsd ?? refund.amount)}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{refund.reason.replace(/_/g, " ")}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest purchasing activity linked to this profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Shipping</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profile.recentOrders.map(order => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs text-primary hover:underline">
                      {order.id}
                    </Link>
                  </TableCell>
                  <TableCell>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"}</TableCell>
                  <TableCell>{formatMoney(order.totalUsd ?? order.total ?? 0)}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{order.status}</Badge></TableCell>
                  <TableCell>
                    {order.shipping ? (
                      <Badge variant="secondary" className="capitalize">{order.shipping.status.replace(/_/g, " ")}</Badge>
                    ) : "None"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Timeline</CardTitle>
          <CardDescription>Tracked checkout, payment, refund, and fulfilment interactions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.engagements.length === 0 ? (
            <div className="text-sm text-muted-foreground">No engagement history recorded yet.</div>
          ) : profile.engagements.map(engagement => (
            <div key={engagement.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{engagement.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(engagement.createdAt).toLocaleString()}</div>
              </div>
              {engagement.detail ? <div className="mt-1 text-sm text-muted-foreground">{engagement.detail}</div> : null}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{engagement.type}</Badge>
                {engagement.orderReference ? <span>Order: {engagement.orderReference}</span> : null}
                {engagement.type === "refund_issue" ? <AlertTriangle className="h-3 w-3" /> : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
