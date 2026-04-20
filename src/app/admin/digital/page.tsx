import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listDigitalOrders, retryDigitalOrderFulfilment } from "@/lib/firestore/digital-orders";
import { formatTokenGroups } from "@/lib/token-format";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminDigitalPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const noticeType = firstParam(params.notice);
  const noticeMessage = firstParam(params.message);
  const orders = await listDigitalOrders();

  async function handleReprocess(orderReference: string) {
    "use server";
    try {
      await retryDigitalOrderFulfilment(orderReference);
      revalidatePath("/admin");
      revalidatePath("/admin/digital");
      revalidatePath("/account");
      redirect(`/admin/digital?notice=success&message=${encodeURIComponent(`Digital order ${orderReference} reprocessed successfully.`)}`);
    } catch (error) {
      unstable_rethrow(error);
      redirect(`/admin/digital?notice=error&message=${encodeURIComponent(error instanceof Error ? error.message : "Digital fulfilment retry failed.")}`);
    }
  }

  const pending = orders.filter(order => order.provisioningStatus === "pending").length;
  const processing = orders.filter(order => order.provisioningStatus === "processing").length;
  const completed = orders.filter(order => order.provisioningStatus === "completed").length;
  const manualReview = orders.filter(order => order.provisioningStatus === "manual_review").length;
  const failed = orders.filter(order => order.provisioningStatus === "failed").length;
  const agedManualReview = orders.filter(order =>
    order.provisioningStatus === "manual_review"
    && Date.now() - Date.parse(order.updatedAt) > 30 * 60 * 1000,
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Digital Operations</h2>
        <p className="text-sm text-muted-foreground">
          Track digital service validations, provisioning outcomes, and manual-review cases.
        </p>
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

      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Pending", value: pending },
          { label: "Processing", value: processing },
          { label: "Completed", value: completed },
          { label: "Manual Review", value: manualReview },
          { label: "Failed", value: failed },
        ].map(item => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fulfilment resilience</CardTitle>
          <CardDescription>
            Background maintenance now escalates digital orders that remain pending or processing beyond the live-service SLA.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Orders older than 30 minutes are promoted into manual review so the storefront stops hanging and operations can intervene quickly.
          </div>
          <Badge variant={agedManualReview > 0 ? "destructive" : "secondary"}>
            {agedManualReview} aged manual review
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent digital orders</CardTitle>
          <CardDescription>
            These records are the operational view for service fulfilment and support escalation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No digital orders recorded yet.
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium uppercase">{order.serviceId}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.customerEmail ?? "no customer email"} • {order.accountReference}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{order.provider}</Badge>
                    <Badge variant={order.provisioningStatus === "manual_review" || order.provisioningStatus === "failed" ? "destructive" : "secondary"}>
                      {order.provisioningStatus}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <div>Order Reference: <span className="font-medium text-foreground">{order.orderReference}</span></div>
                  <div>Updated: <span className="font-medium text-foreground">{new Date(order.updatedAt).toLocaleString()}</span></div>
                  {order.receiptNumber ? <div>Receipt: <span className="font-medium text-foreground">{order.receiptNumber}</span></div> : null}
                  {order.token ? <div className="break-all">Token: <span className="whitespace-pre-line font-mono text-foreground">{formatTokenGroups(order.token)}</span></div> : null}
                </div>
                {order.resultPayload ? (
                  <pre className="mt-3 max-h-52 overflow-auto rounded border bg-muted p-3 text-xs">
                    {JSON.stringify(order.resultPayload, null, 2)}
                  </pre>
                ) : null}
                {["manual_review", "failed", "pending"].includes(order.provisioningStatus) ? (
                  <div className="mt-4">
                    <AdminActionForm
                      action={handleReprocess.bind(null, order.orderReference)}
                      pendingTitle="Reprocessing fulfilment"
                      pendingMessage="We are retrying this digital order and refreshing the admin view."
                    >
                      <Button type="submit" size="sm" variant="outline">
                        Reprocess fulfilment
                      </Button>
                    </AdminActionForm>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
