import Link from "next/link";
import { ArrowUpRight, Clock3, Search, ShieldAlert, Undo2 } from "lucide-react";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listRefundCases } from "@/lib/firestore/orders";
import { getRefundOpsSummary, updateRefundExecutionStatus } from "@/lib/firestore/refunds";
import { revalidatePath } from "next/cache";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatUsd(value?: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

function hoursSince(value?: string) {
  if (!value) return "-";
  const diffMs = Date.now() - new Date(value).getTime();
  return `${Math.max(Math.round(diffMs / (1000 * 60 * 60)), 0)}h`;
}

export default async function AdminRefundsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const query = firstParam(params.q)?.trim().toLowerCase() ?? "";
  const status = firstParam(params.status) ?? "all";

  const [refundCases, refundOps] = await Promise.all([listRefundCases(), getRefundOpsSummary()]);
  const executionMap = new Map(refundOps.executions.map(execution => [execution.refundCaseId, execution]));

  const rows = refundCases.filter(refund => {
    const execution = executionMap.get(refund.id);
    const haystack = [
      refund.id,
      refund.orderReference,
      refund.customerName,
      refund.customerEmail,
      refund.reason,
      execution?.providerReference,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (query && !haystack.includes(query)) return false;
    if (status !== "all") {
      if (refund.status !== status && execution?.status !== status) return false;
    }

    return true;
  });

  async function markExecution(refundCaseId: string, nextStatus: "submitted" | "manual_review" | "failed" | "completed") {
    "use server"
    await updateRefundExecutionStatus({
      refundCaseId,
      status: nextStatus,
      lastError: nextStatus === "failed" ? "Marked as failed by admin review." : undefined,
    })
    revalidatePath("/admin/refunds")
    revalidatePath("/admin/orders")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Refund Execution</h2>
        <p className="text-sm text-muted-foreground">
          Track approved refund cases through execution, manual review, failure handling, and completion.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Queued</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{refundOps.queued}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Submitted</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{refundOps.submitted}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Manual review</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{refundOps.manualReview}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Failed</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{refundOps.failed}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Aged queued</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{refundOps.agedQueued}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{refundOps.completed}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search by refund case, order, customer, or provider reference.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" method="get">
            <div className="relative md:col-span-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={query} placeholder="Search refund cases, orders, customers..." className="pl-9" />
            </div>
            <select name="status" defaultValue={status} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All case/execution statuses</option>
              <option value="open">Case: open</option>
              <option value="investigating">Case: investigating</option>
              <option value="approved">Case: approved</option>
              <option value="rejected">Case: rejected</option>
              <option value="refunded">Case: refunded</option>
              <option value="queued">Execution: queued</option>
              <option value="submitted">Execution: submitted</option>
              <option value="manual_review">Execution: manual review</option>
              <option value="failed">Execution: failed</option>
              <option value="completed">Execution: completed</option>
            </select>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit">Apply Filters</Button>
              <Button variant="outline" asChild>
                <Link href="/admin/refunds">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Refund case</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Case status</TableHead>
              <TableHead>Execution</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(refund => {
              const execution = executionMap.get(refund.id);
              return (
                <TableRow key={refund.id}>
                  <TableCell>
                    <div className="font-medium">{refund.id}</div>
                    <div className="text-xs text-muted-foreground">{refund.orderReference}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{refund.customerName}</div>
                    <div className="text-xs text-muted-foreground">{refund.customerEmail}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={refund.status === "refunded" ? "secondary" : "outline"} className="capitalize">
                      {refund.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {execution ? (
                      <div className="space-y-1">
                        <Badge
                          variant={
                            execution.status === "failed"
                              ? "destructive"
                              : execution.status === "completed"
                                ? "secondary"
                                : "outline"
                          }
                          className="capitalize"
                        >
                          {execution.status.replace(/_/g, " ")}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {execution.providerReference || execution.lastError || execution.provider}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline">Not queued</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {execution ? hoursSince(execution.updatedAt) : hoursSince(refund.updatedAt)}
                  </TableCell>
                  <TableCell>{formatUsd(refund.amountUsd ?? refund.amount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/orders/${refund.orderReference}`}>
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                          Order
                        </Link>
                      </Button>
                      {execution && execution.status !== "completed" ? (
                        <>
                          <AdminActionForm
                            action={markExecution.bind(null, refund.id, "submitted")}
                            pendingTitle="Updating refund execution"
                            pendingMessage="We are marking this refund as submitted."
                          >
                            <Button size="sm" variant="outline">Mark Submitted</Button>
                          </AdminActionForm>
                          <AdminActionForm
                            action={markExecution.bind(null, refund.id, "manual_review")}
                            pendingTitle="Escalating refund"
                            pendingMessage="We are moving this refund into manual review."
                          >
                            <Button size="sm" variant="outline">Manual Review</Button>
                          </AdminActionForm>
                          <AdminActionForm
                            action={markExecution.bind(null, refund.id, "failed")}
                            pendingTitle="Updating refund execution"
                            pendingMessage="We are marking this refund execution as failed."
                          >
                            <Button size="sm" variant="outline">Mark Failed</Button>
                          </AdminActionForm>
                          <AdminActionForm
                            action={markExecution.bind(null, refund.id, "completed")}
                            pendingTitle="Completing refund"
                            pendingMessage="We are closing out this refund execution now."
                          >
                            <Button size="sm">Complete Refund</Button>
                          </AdminActionForm>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No refund cases found for the current filters.
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
              <Undo2 className="h-4 w-4 text-primary" />
              <CardTitle>Execution policy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Approved refund cases should move into queued execution immediately.</div>
            <div>Submitted means the refund is in flight with the gateway or manual finance channel.</div>
            <div>Completed execution automatically closes the case as refunded.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <CardTitle>Aging alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>{refundOps.agedQueued} queued refund execution(s) are older than 24 hours.</div>
            <div>{refundOps.agedManualReview} manual-review refund execution(s) are older than 12 hours.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <CardTitle>Current posture</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Approved refunds now enter an execution record immediately so they do not disappear after approval.</div>
            <div>Where gateway automation is unavailable, the execution is escalated to manual review with an explicit operator message.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
