import { getOrderById, updateOrderStatus } from "@/lib/firestore/orders"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import {
    ArrowLeft,
    Phone,
    Mail,
    CheckCircle2,
    Clock,
    XCircle,
    Truck
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface OrderDetailsPageProps {
    params: {
        id: string
    }
}

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
    const { id } = params
    const order = await getOrderById(id)

    if (!order) {
        notFound()
    }

    async function handleStatusUpdate(status: any) {
        "use server"
        await updateOrderStatus(id, status)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/orders">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-xl font-semibold">Order #{order.id.substring(0, 8)}</h2>
                    <p className="text-sm text-muted-foreground">Placed on {new Date(order.createdAt).toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Items</CardTitle>
                            <CardDescription>Items purchased by the customer</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-center">Quantity</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="flex items-center gap-3">
                                                <div className="relative h-10 w-10 rounded overflow-hidden border">
                                                    <Image src={item.image || "/images/placeholder.webp"} alt={item.name} fill className="object-cover" />
                                                </div>
                                                <span>{item.name}</span>
                                            </TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${(item.price * item.quantity).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right font-bold pt-4">Grand Total</TableCell>
                                        <TableCell className="text-right font-bold pt-4 text-primary text-xl">${order.total?.toFixed(2)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Status</CardTitle>
                            <CardDescription>Update the current progress of this order</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            <form action={handleStatusUpdate.bind(null, 'pending')}>
                                <Button variant={order.status === 'pending' ? 'default' : 'outline'} size="sm" type="submit">
                                    <Clock className="mr-2 h-4 w-4" /> Pending
                                </Button>
                            </form>
                            <form action={handleStatusUpdate.bind(null, 'processing')}>
                                <Button variant={order.status === 'processing' ? 'default' : 'outline'} size="sm" type="submit">
                                    <div className="mr-2 h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" /> Processing
                                </Button>
                            </form>
                            <form action={handleStatusUpdate.bind(null, 'shipped')}>
                                <Button variant={order.status === 'shipped' ? 'default' : 'outline'} size="sm" type="submit">
                                    <Truck className="mr-2 h-4 w-4" /> Shipped
                                </Button>
                            </form>
                            <form action={handleStatusUpdate.bind(null, 'delivered')}>
                                <Button variant={order.status === 'delivered' ? 'default' : 'outline'} size="sm" type="submit">
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Delivered
                                </Button>
                            </form>
                            <form action={handleStatusUpdate.bind(null, 'cancelled')}>
                                <Button variant={order.status === 'cancelled' ? 'destructive' : 'outline'} size="sm" type="submit">
                                    <XCircle className="mr-2 h-4 w-4" /> Cancelled
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="bg-primary/10 p-2 rounded-full text-primary">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium">{order.customerName}</div>
                                    <div className="text-xs text-muted-foreground">Customer</div>
                                </div>
                            </div>
                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{order.customerEmail}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{order.customerPhone || "No phone provided"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm text-muted-foreground">Payment Method</span>
                                <span className="text-sm font-medium uppercase">{order.paymentMethod || 'Paynow'}</span>
                            </div>
                            {order.notes && (
                                <div className="space-y-1">
                                    <div className="text-sm text-muted-foreground">Notes</div>
                                    <div className="text-sm bg-muted p-2 rounded border italic">{order.notes}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
