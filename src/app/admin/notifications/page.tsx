import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getNotificationOpsSummary, resendNotification, retryNotification } from "@/lib/firestore/notifications";
import { runOperationsMaintenance } from "@/lib/ops";
import { revalidatePath } from "next/cache";

export default async function AdminNotificationsPage() {
  const { summary, notifications } = await getNotificationOpsSummary();

  async function handleRetry(notificationId: string) {
    "use server";
    await retryNotification(notificationId);
    revalidatePath("/admin");
    revalidatePath("/admin/notifications");
  }

  async function handleResend(notificationId: string) {
    "use server";
    await resendNotification(notificationId);
    revalidatePath("/admin");
    revalidatePath("/admin/notifications");
  }

  async function handleProcessQueue() {
    "use server";
    await runOperationsMaintenance({ notificationLimit: 100, reservationLimit: 0, refundLimit: 0, digitalLimit: 0 });
    revalidatePath("/admin");
    revalidatePath("/admin/notifications");
  }

  const statCards = [
    { label: "Total", value: summary.total },
    { label: "Queued", value: summary.queued },
    { label: "Sent", value: summary.sent },
    { label: "Failed", value: summary.failed },
    { label: "Customer", value: summary.customerNotifications },
    { label: "Admin", value: summary.adminNotifications },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Milestone notifications generated from live order, payment, shipping, and refund activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {statCards.map(stat => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent notification records</CardTitle>
          <CardDescription>
            Queue-backed records now render branded HTML email while preserving the original plain-text audit narrative.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
            <div>
              <div className="font-medium">Queue processor</div>
              <div className="text-sm text-muted-foreground">
                Use the scheduled worker or run a maintenance sweep now to flush queued notifications immediately.
              </div>
            </div>
            <AdminActionForm
              action={handleProcessQueue}
              pendingTitle="Running maintenance sweep"
              pendingMessage="We are flushing the notifications queue and refreshing delivery records."
            >
              <Button type="submit" size="sm" variant="outline">Run maintenance sweep</Button>
            </AdminActionForm>
          </div>
          {notifications.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No notification records yet.
            </div>
          ) : (
            notifications.map(notification => (
              <div key={notification.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{notification.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {notification.customerEmail ?? "internal"} • {notification.orderReference ?? "no order reference"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{notification.type}</Badge>
                    <Badge variant={notification.status === "failed" ? "destructive" : "secondary"}>
                      {notification.status}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{notification.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(notification.createdAt).toLocaleString()}</span>
                  <span>•</span>
                  <span>{notification.channels.join(", ")}</span>
                  <span>•</span>
                  <span>{notification.audience}</span>
                </div>
                {notification.error ? (
                  <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    {notification.error}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {notification.status === "failed" || notification.status === "queued" ? (
                    <AdminActionForm
                      action={handleRetry.bind(null, notification.id)}
                      pendingTitle="Retrying delivery"
                      pendingMessage="We are resubmitting this notification for delivery."
                    >
                      <Button type="submit" size="sm" variant="outline">Retry delivery</Button>
                    </AdminActionForm>
                  ) : null}
                  {notification.status === "sent" ? (
                    <AdminActionForm
                      action={handleResend.bind(null, notification.id)}
                      pendingTitle="Resending notification"
                      pendingMessage="We are sending this email again now."
                    >
                      <Button type="submit" size="sm" variant="outline">Resend email</Button>
                    </AdminActionForm>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
