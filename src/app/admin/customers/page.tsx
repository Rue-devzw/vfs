import { Search, Mail, Phone, ReceiptText } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCustomers } from "@/lib/firestore/customers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const query = firstParam(params.q)?.trim().toLowerCase() ?? "";

  const customers = await listCustomers();
  const filtered = customers.filter(customer => {
    const haystack = [customer.name, customer.email, customer.phone, customer.address]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !query || haystack.includes(query);
  });

  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Customer Directory</h2>
        <p className="text-muted-foreground">Profiles built from live orders and customer records in Firestore.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Known Customers</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{customers.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Lifetime Revenue</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatMoney(totalRevenue)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Average Orders / Customer</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{customers.length ? (customers.reduce((sum, customer) => sum + customer.orderCount, 0) / customers.length).toFixed(1) : "0.0"}</CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Filter by name, email, phone, or address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={query} placeholder="Search customers..." className="pl-9" />
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Last Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(customer => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Link href={`/admin/customers/${encodeURIComponent(customer.email)}`} className="font-medium text-primary hover:underline">
                    {customer.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{customer.address || "No address on file"}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {customer.email}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {customer.phone || "No phone"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ReceiptText className="h-4 w-4 text-muted-foreground" />
                    {customer.orderCount}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {customer.preferredDeliveryMethod ? (
                      <Badge variant="outline" className="capitalize">
                        {customer.preferredDeliveryMethod}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary">{customer.savedAddressCount} address(es)</Badge>
                    {customer.openRefundCaseCount > 0 ? (
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                        {customer.openRefundCaseCount} refund issue(s)
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>{formatMoney(customer.totalSpent)}</TableCell>
                <TableCell>
                  <div className="text-sm">{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleString() : "No orders yet"}</div>
                  <div className="text-xs text-muted-foreground">{customer.lastOrderReference || "No reference"}</div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No customers match the current search.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
