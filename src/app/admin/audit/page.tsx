import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listAuditLogs } from "@/lib/firestore/audit";

export default async function AdminAuditPage() {
  const logs = await listAuditLogs();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          Administrative changes across orders, refunds, notifications, and settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent admin actions</CardTitle>
          <CardDescription>Every operational change is recorded here for traceability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No audit records yet.
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{log.detail}</div>
                    <div className="text-xs text-muted-foreground">
                      {log.targetType} • {log.targetId}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{log.action}</Badge>
                    <Badge variant="secondary">{log.actorRole}</Badge>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
                {log.meta && Object.keys(log.meta).length > 0 ? (
                  <pre className="mt-3 max-h-52 overflow-auto rounded border bg-muted p-3 text-xs">
                    {JSON.stringify(log.meta, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
