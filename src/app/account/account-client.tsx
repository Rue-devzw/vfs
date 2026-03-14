"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AccountLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/account/logout", { method: "POST" });
      router.push("/account/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={loading}>
      {loading ? "Signing out..." : "Sign out"}
    </Button>
  );
}

export function RefundRequestCard(props: {
  orderReference: string;
  disabled?: boolean;
  existingRefund?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(props.orderReference)}/refund-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detail }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to submit refund request.");
      }

      setMessage(data.message || "Refund request submitted.");
      setOpen(false);
      setDetail("");
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to submit refund request.");
    } finally {
      setLoading(false);
    }
  }

  if (props.existingRefund) {
    return <Button size="sm" variant="outline" disabled>Refund already requested</Button>;
  }

  return (
    <div className="space-y-2">
      {!open ? (
        <Button size="sm" variant="outline" disabled={props.disabled} onClick={() => setOpen(true)}>
          Request refund
        </Button>
      ) : (
        <div className="w-full space-y-2 rounded-xl border bg-muted/20 p-3">
          <Textarea
            rows={3}
            value={detail}
            onChange={event => setDetail(event.target.value)}
            placeholder="Describe the payment issue, missing delivery, duplicate charge, or other refund reason."
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={loading || detail.trim().length < 10} onClick={handleSubmit}>
              {loading ? "Submitting..." : "Submit refund request"}
            </Button>
            <Button size="sm" variant="ghost" disabled={loading} onClick={() => { setOpen(false); setError(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {message ? <p className="text-xs text-primary">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
