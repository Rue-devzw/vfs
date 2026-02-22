import { listOrders } from "@/lib/firestore/orders"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Eye, Search, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { isFirebaseConfigured } from "@/lib/firebase-admin"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminOrdersPage() {
    if (!isFirebaseConfigured()) {
        return (
            <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                    <div className="flex items-center gap-2 text-yellow-700">
                        <AlertTriangle className="h-5 w-5" />
                        <CardTitle>Configuration Required</CardTitle>
                    </div>
                    <CardDescription className="text-yellow-600">
                        Firestore must be configured to view transactions.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const orders = await listOrders()

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">Transactions & Orders</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">Export CSV</Button>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-card p-4 rounded-lg border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search orders by customer, ID, or phone..."
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="bg-card rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-mono text-xs">
                                    {order.id.substring(0, 8)}...
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{order.customerName}</div>
                                    <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                                </TableCell>
                                <TableCell className="text-sm">
                                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                                </TableCell>
                                <TableCell className="font-semibold">
                                    ${order.total?.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                'bg-blue-100 text-blue-800'
                                        }`}>
                                        {order.status === 'pending' && <Clock className="h-3 w-3" />}
                                        {order.status === 'delivered' && <CheckCircle2 className="h-3 w-3" />}
                                        {order.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                                        <span className="capitalize">{order.status}</span>
                                    </div>
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
                        {orders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No orders found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
