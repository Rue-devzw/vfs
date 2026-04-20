import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardCheck, FileDown, PackageSearch, ShieldCheck } from "lucide-react";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  captureInventoryCountVariance,
  claimReconciliationException,
  getReconciliationWorkspace,
  listReconciliationBatches,
  resolveReconciliationException,
  syncReconciliationBatch,
  updateReconciliationBatch,
} from "@/lib/firestore/reconciliation";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-ZW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function businessDateLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function noticeUrl(type: "success" | "error", message: string) {
  return `/admin/reconciliation?notice=${type}&message=${encodeURIComponent(message)}`;
}

function getActionErrorMessage(error: unknown, fallback: string) {
  unstable_rethrow(error);
  return error instanceof Error ? error.message : fallback;
}

export default async function AdminReconciliationPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const noticeType = firstParam(params.notice);
  const noticeMessage = firstParam(params.message);
  const businessDate = firstParam(params.businessDate) ?? businessDateLabel();
  const [workspace, batches] = await Promise.all([
    getReconciliationWorkspace(),
    listReconciliationBatches(),
  ]);
  const latestBatch = batches[0];

  async function handleSyncBatch(formData: FormData) {
    "use server";
    const batchDate = String(formData.get("businessDate") ?? businessDateLabel());
    try {
      await syncReconciliationBatch(batchDate);
      revalidatePath("/admin");
      revalidatePath("/admin/payments");
      revalidatePath("/admin/shipments");
      revalidatePath("/admin/reconciliation");
      redirect(noticeUrl("success", `Reconciliation batch ${batchDate} synchronized.`));
    } catch (error) {
      redirect(noticeUrl("error", getActionErrorMessage(error, "Failed to sync reconciliation batch.")));
    }
  }

  async function handleBatchStatus(formData: FormData) {
    "use server";
    const batchDate = String(formData.get("businessDate") ?? businessDateLabel());
    const status = String(formData.get("status") ?? "open") as "open" | "reconciled" | "locked";
    const notes = String(formData.get("notes") ?? "");
    try {
      await updateReconciliationBatch({ businessDate: batchDate, status, notes });
      revalidatePath("/admin/reconciliation");
      redirect(noticeUrl("success", `Batch ${batchDate} updated to ${status}.`));
    } catch (error) {
      redirect(noticeUrl("error", getActionErrorMessage(error, "Failed to update batch.")));
    }
  }

  async function handleClaim(formData: FormData) {
    "use server";
    const type = String(formData.get("type")) as Parameters<typeof claimReconciliationException>[0]["type"];
    const reference = String(formData.get("reference"));
    const note = String(formData.get("note") ?? "");
    try {
      await claimReconciliationException({ type, reference, note });
      revalidatePath("/admin/reconciliation");
      redirect(noticeUrl("success", `Exception ${type}:${reference} claimed.`));
    } catch (error) {
      redirect(noticeUrl("error", getActionErrorMessage(error, "Failed to claim exception.")));
    }
  }

  async function handleResolve(formData: FormData) {
    "use server";
    const type = String(formData.get("type")) as Parameters<typeof resolveReconciliationException>[0]["type"];
    const reference = String(formData.get("reference"));
    const note = String(formData.get("note") ?? "");
    try {
      await resolveReconciliationException({ type, reference, note });
      revalidatePath("/admin/reconciliation");
      redirect(noticeUrl("success", `Exception ${type}:${reference} marked resolved.`));
    } catch (error) {
      redirect(noticeUrl("error", getActionErrorMessage(error, "Failed to resolve exception.")));
    }
  }

  async function handleVariance(formData: FormData) {
    "use server";
    const sku = String(formData.get("sku") ?? "");
    const countedStockOnHand = Number(formData.get("countedStockOnHand") ?? 0);
    const note = String(formData.get("note") ?? "");

    try {
      const result = await captureInventoryCountVariance({ sku, countedStockOnHand, note });
      revalidatePath("/admin/reconciliation");
      redirect(
        noticeUrl(
          "success",
          result.changed
            ? `Stock count recorded for ${result.sku}. Variance: ${(result.delta ?? 0) > 0 ? "+" : ""}${result.delta ?? 0}.`
            : `No stock change recorded for ${result.sku}.`,
        ),
      );
    } catch (error) {
      redirect(noticeUrl("error", getActionErrorMessage(error, "Failed to record stock count.")));
    }
  }

  const summaryCards = [
    { label: "Sales", value: String(workspace.summary.salesCount), detail: formatUsd(workspace.summary.totalSalesUsd) },
    { label: "Collected", value: String(workspace.summary.collectedCount), detail: formatUsd(workspace.summary.collectedSalesUsd) },
    { label: "Delivered", value: String(workspace.summary.deliveredCount), detail: formatUsd(workspace.summary.deliveredSalesUsd) },
    { label: "Exceptions", value: String(workspace.summary.totalExceptions), detail: `${workspace.summary.paymentExceptions} payment • ${workspace.summary.dispatchExceptions} dispatch` },
    { label: "Inventory Variances", value: String(workspace.summary.inventoryVariances), detail: "Physical count adjustments recorded" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Reconciliation & Controls</h2>
        <p className="text-sm text-muted-foreground">
          Daily close controls, exception ownership, proof-of-delivery enforcement, and stock movement oversight.
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
        {summaryCards.map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle>Daily Close</CardTitle>
            </div>
            <CardDescription>
              Synchronize the day’s sales, collections, delivery, digital, refund, and inventory controls before reconciling or locking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminActionForm
              action={handleSyncBatch}
              className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end"
              pendingTitle="Synchronizing batch"
              pendingMessage="We are pulling the latest reconciliation totals and exception counts."
            >
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="businessDate">Business date</label>
                <Input id="businessDate" name="businessDate" type="date" defaultValue={businessDate} />
              </div>
              <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                Sync pulls the live exception counts and current sales/collection/delivery totals into the batch.
              </div>
              <Button type="submit">Sync Batch</Button>
            </AdminActionForm>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Current batch</div>
                <div className="mt-2 text-lg font-semibold">{latestBatch?.businessDate ?? businessDate}</div>
                <Badge variant={latestBatch?.status === "locked" ? "secondary" : latestBatch?.status === "reconciled" ? "outline" : "destructive"} className="mt-3 capitalize">
                  {latestBatch?.status ?? "open"}
                </Badge>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Total exceptions</div>
                <div className="mt-2 text-lg font-semibold">{workspace.summary.totalExceptions}</div>
                <div className="mt-3 text-xs text-muted-foreground">Close should not be locked while exceptions are unresolved.</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Control exports</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/api/admin/reconciliation/export?pack=exceptions">
                      <FileDown className="mr-2 h-4 w-4" />
                      Exceptions CSV
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/api/admin/reconciliation/export?pack=inventory_movements">
                      <FileDown className="mr-2 h-4 w-4" />
                      Stock Ledger CSV
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <AdminActionForm
              action={handleBatchStatus}
              className="grid gap-3 rounded-lg border p-4"
              pendingTitle="Updating batch status"
              pendingMessage="We are saving the reconciliation outcome and close notes."
            >
              <input type="hidden" name="businessDate" value={latestBatch?.businessDate ?? businessDate} />
              <Textarea
                name="notes"
                defaultValue={latestBatch?.notes ?? ""}
                placeholder="Close notes, external settlement evidence, or exceptions accepted by finance."
                className="min-h-24"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" name="status" value="reconciled" variant="outline">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Mark Reconciled
                </Button>
                <Button type="submit" name="status" value="locked">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Lock Batch
                </Button>
              </div>
            </AdminActionForm>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PackageSearch className="h-4 w-4 text-primary" />
              <CardTitle>Physical Count Variance</CardTitle>
            </div>
            <CardDescription>
              Record stock counts and preserve a true inventory movement ledger for shrinkage, receiving, and count corrections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminActionForm
              action={handleVariance}
              className="space-y-3"
              pendingTitle="Recording stock variance"
              pendingMessage="We are saving this count adjustment into the reconciliation ledger."
            >
              <Input name="sku" placeholder="SKU" />
              <Input name="countedStockOnHand" type="number" min="0" placeholder="Counted stock on hand" />
              <Textarea name="note" placeholder="Variance note or count reference" className="min-h-24" />
              <Button type="submit">Record Stock Count</Button>
            </AdminActionForm>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <CardTitle>Open Exceptions</CardTitle>
          </div>
          <CardDescription>
            Claim ownership, resolve exceptions, and export the pack for finance or operations review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workspace.exceptionRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No open control exceptions detected.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspace.exceptionRows.slice(0, 40).map(row => (
                  <TableRow key={`${row.type}:${row.reference}`}>
                    <TableCell>
                      <Badge
                        variant={row.severity === "critical" ? "destructive" : row.severity === "high" ? "outline" : "secondary"}
                        className="capitalize"
                      >
                        {row.type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.reference}</div>
                      <div className="text-xs text-muted-foreground">{row.orderReference ?? row.customerEmail ?? "-"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.summary}</div>
                      <div className="text-xs text-muted-foreground">{row.detail}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.ageHours}h</div>
                      <div className="text-xs text-muted-foreground capitalize">{row.ageBucket}</div>
                    </TableCell>
                    <TableCell>
                      {row.ownerLabel ? (
                        <div>
                          <div className="font-medium">{row.ownerLabel}</div>
                          <div className="text-xs text-muted-foreground capitalize">{row.ownerStatus ?? "open"}</div>
                        </div>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {row.orderReference ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/orders/${row.orderReference}`}>
                              <ArrowUpRight className="mr-2 h-4 w-4" />
                              Order
                            </Link>
                          </Button>
                        ) : null}
                        <AdminActionForm
                          action={handleClaim}
                          pendingTitle="Claiming exception"
                          pendingMessage="We are assigning this reconciliation exception to the current workflow."
                        >
                          <input type="hidden" name="type" value={row.type} />
                          <input type="hidden" name="reference" value={row.reference} />
                          <Button size="sm" variant="outline">Claim</Button>
                        </AdminActionForm>
                        <AdminActionForm
                          action={handleResolve}
                          pendingTitle="Resolving exception"
                          pendingMessage="We are marking this reconciliation exception as resolved."
                        >
                          <input type="hidden" name="type" value={row.type} />
                          <input type="hidden" name="reference" value={row.reference} />
                          <Button size="sm" variant="outline">Resolve</Button>
                        </AdminActionForm>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Close Batches</CardTitle>
            <CardDescription>Daily close states and operators who handled them.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {batches.slice(0, 8).map(batch => (
              <div key={batch.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{batch.businessDate}</div>
                    <div className="text-xs text-muted-foreground">{batch.ownerLabel ?? "No owner"} • {formatDate(batch.updatedAt)}</div>
                  </div>
                  <Badge variant={batch.status === "locked" ? "secondary" : batch.status === "reconciled" ? "outline" : "destructive"} className="capitalize">
                    {batch.status}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {formatUsd(batch.summary.collectedSalesUsd)} collected • {batch.summary.totalExceptions} exception(s)
                </div>
              </div>
            ))}
            {batches.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No reconciliation batches have been created yet.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
            <CardDescription>Reservation, fulfilment, expiry, and variance activity from the inventory ledger.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspace.inventoryMovements.slice(0, 8).map(movement => (
              <div key={movement.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{movement.sku}</div>
                    <div className="text-xs text-muted-foreground">{movement.movementType.replace(/_/g, " ")} • {formatDate(movement.createdAt)}</div>
                  </div>
                  <Badge variant={movement.movementType === "count_variance" ? "destructive" : "outline"}>
                    {movement.quantityDeltaOnHand > 0 ? "+" : ""}{movement.quantityDeltaOnHand}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Reserved delta {movement.quantityDeltaReserved > 0 ? "+" : ""}{movement.quantityDeltaReserved}
                  {movement.orderReference ? ` • ${movement.orderReference}` : ""}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
