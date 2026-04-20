import {
    getOrderById,
    listRefundCases,
    updateOrderShippingStatus,
    updateOrderStatus,
    updateRefundCaseStatus,
} from "@/lib/firestore/orders"
import { getRefundExecution, updateRefundExecutionStatus } from "@/lib/firestore/refunds"
import { getShipmentByOrderReference, updateShipmentForOrder } from "@/lib/firestore/shipments"
import { notFound, redirect, unstable_rethrow } from "next/navigation"
import { AdminActionForm } from "@/components/admin/admin-action-form"
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
import { revalidatePath } from "next/cache"
import { resolveAdminImageSrc } from "@/lib/admin-images"
import { Badge } from "@/components/ui/badge"

interface OrderDetailsPageProps {
    params: Promise<{
        id: string
    }>
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value
}

function buildOrderAdminUrl(id: string, noticeType: "success" | "error", message: string) {
    return `/admin/orders/${id}?notice=${noticeType}&message=${encodeURIComponent(message)}`
}

function getActionErrorMessage(error: unknown, fallback: string) {
    unstable_rethrow(error)
    return error instanceof Error ? error.message : fallback
}

export default async function OrderDetailsPage({ params, searchParams }: OrderDetailsPageProps) {
    const { id } = await params
    const query = (await searchParams) ?? {}
    const noticeType = firstParam(query.notice)
    const noticeMessage = firstParam(query.message)
    const [order, refundCases, shipment] = await Promise.all([
        getOrderById(id),
        listRefundCases({ orderReference: id }),
        getShipmentByOrderReference(id),
    ])

    const refundExecutions = await Promise.all(refundCases.map(refund => getRefundExecution(refund.id)))
    const refundExecutionMap = new Map(
        refundCases.map((refund, index) => [refund.id, refundExecutions[index]])
    )

    if (!order) {
        notFound()
    }

    async function handleStatusUpdate(status: "pending" | "processing" | "shipped" | "delivered" | "cancelled") {
        "use server"
        try {
            await updateOrderStatus(id, status)
            revalidatePath("/admin")
            revalidatePath("/admin/orders")
            revalidatePath(`/admin/orders/${id}`)
            revalidatePath("/admin/customers")
            redirect(buildOrderAdminUrl(id, "success", `Order moved to ${status}.`))
        } catch (error) {
            redirect(buildOrderAdminUrl(
                id,
                "error",
                getActionErrorMessage(error, "Order status update failed."),
            ))
        }
    }

    async function handleShippingUpdate(status: "awaiting_payment" | "pickup_pending" | "ready_for_dispatch" | "out_for_delivery" | "delivered" | "collected" | "issue") {
        "use server"
        try {
            await updateOrderShippingStatus(id, status)
            revalidatePath("/admin/orders")
            revalidatePath(`/admin/orders/${id}`)
            revalidatePath("/admin/customers")
            redirect(buildOrderAdminUrl(id, "success", `Shipping moved to ${status.replaceAll("_", " ")}.`))
        } catch (error) {
            redirect(buildOrderAdminUrl(
                id,
                "error",
                getActionErrorMessage(error, "Shipping status update failed."),
            ))
        }
    }

    async function handleRefundUpdate(refundCaseId: string, status: "open" | "investigating" | "approved" | "rejected" | "refunded" | "closed") {
        "use server"
        try {
            await updateRefundCaseStatus(refundCaseId, status, `Admin moved refund case to ${status}.`)
            revalidatePath("/admin/orders")
            revalidatePath(`/admin/orders/${id}`)
            revalidatePath("/admin/customers")
            revalidatePath("/admin/refunds")
            redirect(buildOrderAdminUrl(id, "success", `Refund case moved to ${status}.`))
        } catch (error) {
            redirect(buildOrderAdminUrl(
                id,
                "error",
                getActionErrorMessage(error, "Refund case update failed."),
            ))
        }
    }

    async function handleRefundExecutionUpdate(refundCaseId: string, status: "submitted" | "manual_review" | "failed" | "completed") {
        "use server"
        try {
            await updateRefundExecutionStatus({
                refundCaseId,
                status,
                lastError: status === "failed" ? "Marked as failed from order review." : undefined,
            })
            revalidatePath("/admin/orders")
            revalidatePath(`/admin/orders/${id}`)
            revalidatePath("/admin/refunds")
            redirect(buildOrderAdminUrl(id, "success", `Refund execution moved to ${status}.`))
        } catch (error) {
            redirect(buildOrderAdminUrl(
                id,
                "error",
                getActionErrorMessage(error, "Refund execution update failed."),
            ))
        }
    }

    async function handleShipmentAssignment(formData: FormData) {
        "use server"
        try {
            await updateShipmentForOrder({
                orderReference: id,
                courierName: String(formData.get("courierName") || ""),
                courierPhone: String(formData.get("courierPhone") || ""),
                assignmentNotes: String(formData.get("assignmentNotes") || ""),
                proofOfDeliveryUrl: String(formData.get("proofOfDeliveryUrl") || ""),
            })
            revalidatePath("/admin/orders")
            revalidatePath(`/admin/orders/${id}`)
            redirect(buildOrderAdminUrl(id, "success", "Shipment assignment updated."))
        } catch (error) {
            redirect(buildOrderAdminUrl(
                id,
                "error",
                getActionErrorMessage(error, "Shipment assignment update failed."),
            ))
        }
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

            {noticeMessage ? (
                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                        noticeType === "error"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-green-200 bg-green-50 text-green-700"
                    }`}
                >
                    {noticeMessage}
                </div>
            ) : null}

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
                                                    <Image src={resolveAdminImageSrc(item.image, item.name)} alt={item.name} fill className="object-cover" />
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
                            <AdminActionForm
                                action={handleStatusUpdate.bind(null, 'pending')}
                                pendingTitle="Updating order status"
                                pendingMessage="We are moving this order to pending."
                            >
                                <Button variant={order.status === 'pending' ? 'default' : 'outline'} size="sm" type="submit">
                                    <Clock className="mr-2 h-4 w-4" /> Pending
                                </Button>
                            </AdminActionForm>
                            <AdminActionForm
                                action={handleStatusUpdate.bind(null, 'processing')}
                                pendingTitle="Updating order status"
                                pendingMessage="We are moving this order into processing."
                            >
                                <Button variant={order.status === 'processing' ? 'default' : 'outline'} size="sm" type="submit">
                                    <div className="mr-2 h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" /> Processing
                                </Button>
                            </AdminActionForm>
                            <AdminActionForm
                                action={handleStatusUpdate.bind(null, 'shipped')}
                                pendingTitle="Updating order status"
                                pendingMessage="We are marking this order as shipped."
                            >
                                <Button variant={order.status === 'shipped' ? 'default' : 'outline'} size="sm" type="submit">
                                    <Truck className="mr-2 h-4 w-4" /> Shipped
                                </Button>
                            </AdminActionForm>
                            <AdminActionForm
                                action={handleStatusUpdate.bind(null, 'delivered')}
                                pendingTitle="Updating order status"
                                pendingMessage="We are marking this order as delivered."
                            >
                                <Button variant={order.status === 'delivered' ? 'default' : 'outline'} size="sm" type="submit">
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Delivered
                                </Button>
                            </AdminActionForm>
                            <AdminActionForm
                                action={handleStatusUpdate.bind(null, 'cancelled')}
                                pendingTitle="Updating order status"
                                pendingMessage="We are cancelling this order now."
                            >
                                <Button variant={order.status === 'cancelled' ? 'destructive' : 'outline'} size="sm" type="submit">
                                    <XCircle className="mr-2 h-4 w-4" /> Cancelled
                                </Button>
                            </AdminActionForm>
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
                            {order.orderNumber ? (
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">Order Number</span>
                                    <span className="text-sm font-medium">{order.orderNumber}</span>
                                </div>
                            ) : null}
                            {order.invoiceNumber ? (
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">Invoice Number</span>
                                    <span className="text-sm font-medium">{order.invoiceNumber}</span>
                                </div>
                            ) : null}
                            <div className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm text-muted-foreground">Payment Method</span>
                                <span className="text-sm font-medium uppercase">{order.paymentMethod || 'Paynow'}</span>
                            </div>
                            {typeof order.subtotalUsd === "number" ? (
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">Subtotal (USD)</span>
                                    <span className="text-sm font-medium">${order.subtotalUsd.toFixed(2)}</span>
                                </div>
                            ) : null}
                            {typeof order.deliveryFeeUsd === "number" ? (
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">Delivery Fee (USD)</span>
                                    <span className="text-sm font-medium">${order.deliveryFeeUsd.toFixed(2)}</span>
                                </div>
                            ) : null}
                            {typeof order.taxTotalUsd === "number" ? (
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">{order.taxLabel || "Tax"} (USD)</span>
                                    <span className="text-sm font-medium">${order.taxTotalUsd.toFixed(2)}</span>
                                </div>
                            ) : null}
                            {order.currencyCode ? (
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">Currency</span>
                                    <span className="text-sm font-medium">{order.currencyCode}</span>
                                </div>
                            ) : null}
                            {order.totalUsd ? (
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm text-muted-foreground">USD Total</span>
                                    <span className="text-sm font-medium">${order.totalUsd.toFixed(2)}</span>
                                </div>
                            ) : null}
                            {order.notes && (
                                <div className="space-y-1">
                                    <div className="text-sm text-muted-foreground">Notes</div>
                                    <div className="text-sm bg-muted p-2 rounded border italic">{order.notes}</div>
                                </div>
                            )}
                            {order.paymentMeta ? (
                                <div className="space-y-1">
                                    <div className="text-sm text-muted-foreground">Gateway Metadata</div>
                                    <pre className="max-h-64 overflow-auto rounded border bg-muted p-3 text-xs">
                                        {JSON.stringify(order.paymentMeta, null, 2)}
                                    </pre>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Shipping & Fulfilment</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">Method</span>
                                    <span className="font-medium capitalize">{order.shipping?.deliveryMethod || "collect"}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">Current fulfilment</span>
                                    <Badge variant="secondary" className="capitalize">{order.shipping?.status?.replace(/_/g, " ") || "Not set"}</Badge>
                                </div>
                                {order.shipping?.zoneName ? (
                                    <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">Zone</span>
                                        <span className="font-medium">{order.shipping.zoneName}</span>
                                    </div>
                                ) : null}
                                {(order.shipping?.etaMinHours || order.shipping?.etaMaxHours) ? (
                                    <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">ETA window</span>
                                        <span className="font-medium">{order.shipping.etaMinHours ?? 0}-{order.shipping.etaMaxHours ?? 0} hrs</span>
                                    </div>
                                ) : null}
                                {shipment?.courierName ? (
                                    <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">Courier</span>
                                        <span className="font-medium">{shipment.courierName}</span>
                                    </div>
                                ) : null}
                                {shipment?.courierPhone ? (
                                    <div className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">Courier Phone</span>
                                        <span className="font-medium">{shipment.courierPhone}</span>
                                    </div>
                                ) : null}
                                {order.shipping?.address ? (
                                    <div className="space-y-1 rounded border bg-muted/20 p-3">
                                        <div className="font-medium">Address</div>
                                        <div className="text-muted-foreground">{order.shipping.address}</div>
                                        {order.shipping.instructions ? <div className="text-xs text-muted-foreground">{order.shipping.instructions}</div> : null}
                                        {(order.shipping.recipientName || order.shipping.recipientPhone) ? (
                                            <div className="text-xs text-muted-foreground">
                                                Recipient: {order.shipping.recipientName || "Unknown"} {order.shipping.recipientPhone ? `• ${order.shipping.recipientPhone}` : ""}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                                {shipment?.assignmentNotes ? (
                                    <div className="space-y-1 rounded border bg-muted/20 p-3">
                                        <div className="font-medium">Assignment Notes</div>
                                        <div className="text-muted-foreground">{shipment.assignmentNotes}</div>
                                    </div>
                                ) : null}
                                {shipment?.proofOfDeliveryUrl ? (
                                    <div className="space-y-1 rounded border bg-muted/20 p-3">
                                        <div className="font-medium">Proof of Delivery</div>
                                        <Link href={shipment.proofOfDeliveryUrl} className="break-all text-primary underline">
                                            {shipment.proofOfDeliveryUrl}
                                        </Link>
                                    </div>
                                ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {["awaiting_payment", "pickup_pending", "ready_for_dispatch", "out_for_delivery", "delivered", "collected", "issue"].map(status => (
                                    <AdminActionForm
                                        key={status}
                                        action={handleShippingUpdate.bind(null, status as "awaiting_payment" | "pickup_pending" | "ready_for_dispatch" | "out_for_delivery" | "delivered" | "collected" | "issue")}
                                        pendingTitle="Updating fulfilment status"
                                        pendingMessage={`We are moving this shipment to ${status.replace(/_/g, " ")}.`}
                                    >
                                        <Button variant={order.shipping?.status === status ? "default" : "outline"} size="sm" type="submit" className="capitalize">
                                            {status.replace(/_/g, " ")}
                                        </Button>
                                    </AdminActionForm>
                                ))}
                            </div>
                            <AdminActionForm
                                action={handleShipmentAssignment}
                                className="space-y-3 rounded-lg border p-4"
                                pendingTitle="Saving shipment assignment"
                                pendingMessage="We are updating courier and proof-of-delivery details."
                            >
                                <div className="text-sm font-medium">Shipment Assignment</div>
                                <div className="grid gap-3">
                                    <div className="space-y-1">
                                        <label htmlFor="courierName" className="text-sm text-muted-foreground">Courier Name</label>
                                        <input
                                            id="courierName"
                                            name="courierName"
                                            defaultValue={shipment?.courierName || ""}
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="courierPhone" className="text-sm text-muted-foreground">Courier Phone</label>
                                        <input
                                            id="courierPhone"
                                            name="courierPhone"
                                            defaultValue={shipment?.courierPhone || ""}
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="proofOfDeliveryUrl" className="text-sm text-muted-foreground">Proof of Delivery URL</label>
                                        <input
                                            id="proofOfDeliveryUrl"
                                            name="proofOfDeliveryUrl"
                                            defaultValue={shipment?.proofOfDeliveryUrl || ""}
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="assignmentNotes" className="text-sm text-muted-foreground">Assignment Notes</label>
                                        <textarea
                                            id="assignmentNotes"
                                            name="assignmentNotes"
                                            defaultValue={shipment?.assignmentNotes || ""}
                                            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" variant="outline" size="sm">Save Shipment Details</Button>
                            </AdminActionForm>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Refund Cases</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {refundCases.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No refund or payment issue cases linked to this order.</p>
                            ) : refundCases.map(refund => (
                                <div key={refund.id} className="rounded-lg border p-3 space-y-3">
                                    {(() => {
                                        const execution = refundExecutionMap.get(refund.id)
                                        return (
                                            <>
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="font-medium">{refund.reason.replace(/_/g, " ")}</div>
                                            <div className="text-xs text-muted-foreground">{refund.id}</div>
                                        </div>
                                        <Badge variant={refund.status === "refunded" ? "secondary" : "outline"} className="capitalize">
                                            {refund.status}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Amount: ${(refund.amountUsd ?? refund.amount).toFixed(2)}
                                    </div>
                                    <div className="rounded border bg-muted/20 p-2 text-xs text-muted-foreground">
                                        Execution: {execution ? execution.status.replace(/_/g, " ") : "not queued"}
                                        {execution?.providerReference ? ` • ${execution.providerReference}` : ""}
                                        {execution?.lastError ? ` • ${execution.lastError}` : ""}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {["open", "investigating", "approved", "rejected", "refunded", "closed"].map(status => (
                                            <AdminActionForm
                                                key={status}
                                                action={handleRefundUpdate.bind(null, refund.id, status as "open" | "investigating" | "approved" | "rejected" | "refunded" | "closed")}
                                                pendingTitle="Updating refund case"
                                                pendingMessage={`We are moving this refund case to ${status}.`}
                                            >
                                                <Button variant={refund.status === status ? "default" : "outline"} size="sm" type="submit" className="capitalize">
                                                    {status}
                                                </Button>
                                            </AdminActionForm>
                                        ))}
                                    </div>
                                    {execution && execution.status !== "completed" ? (
                                        <div className="flex flex-wrap gap-2">
                                            {["submitted", "manual_review", "failed", "completed"].map(status => (
                                                <AdminActionForm
                                                    key={status}
                                                    action={handleRefundExecutionUpdate.bind(null, refund.id, status as "submitted" | "manual_review" | "failed" | "completed")}
                                                    pendingTitle="Updating refund execution"
                                                    pendingMessage={`We are marking this refund execution as ${status.replace(/_/g, " ")}.`}
                                                >
                                                    <Button variant="outline" size="sm" type="submit" className="capitalize">
                                                        {status.replace(/_/g, " ")}
                                                    </Button>
                                                </AdminActionForm>
                                            ))}
                                        </div>
                                    ) : null}
                                    {refund.notes?.length ? (
                                        <div className="rounded border bg-muted/20 p-2 text-xs text-muted-foreground">
                                            {refund.notes[refund.notes.length - 1]}
                                        </div>
                                    ) : null}
                                            </>
                                        )
                                    })()}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
