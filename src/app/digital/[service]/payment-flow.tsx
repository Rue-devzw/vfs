"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Loader2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentMethod = "WALLETPLUS" | "ECOCASH" | "INNBUCKS" | "OMARI" | "CARD";

function isPaymentMethod(value: string): value is PaymentMethod {
  return ["WALLETPLUS", "ECOCASH", "INNBUCKS", "OMARI", "CARD"].includes(value);
}

export function GenericDigitalFlow({ service, serviceLabel }: { service: string; serviceLabel: string }) {
  const { toast } = useToast();
  const [accountReference, setAccountReference] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("WALLETPLUS");
  const [customerMobile, setCustomerMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<{ reference: string; transactionReference: string } | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const needsOtp = paymentMethod === "WALLETPLUS" || paymentMethod === "OMARI";
  const isCard = paymentMethod === "CARD";

  const initiate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/digital/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: service.toUpperCase(),
          accountNumber: accountReference,
          amount: Number(amount),
          paymentMethod,
          customerMobile: isCard ? undefined : customerMobile,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to initiate payment");

      if (isCard && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      if (needsOtp) {
        setPending({ reference: data.reference, transactionReference: data.transactionReference });
        setStatus(String(data.status || "PENDING").toUpperCase());
        toast({ title: "OTP Required", description: data.message || "Enter OTP to confirm payment." });
      } else {
        // USSD Push flow
        toast({ title: "USSD Prompt Sent", description: "Please complete payment on your phone." });
        setAccountReference("");
        setAmount("");
        setCustomerMobile("");
      }
    } catch (error) {
      toast({ title: "Initiation failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!pending) return;
    setLoading(true);
    try {
      const res = await fetch("/api/zb/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: pending.reference,
          transactionReference: pending.transactionReference,
          otp,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "OTP confirmation failed");

      let nextStatus = String(data.status || "PENDING").toUpperCase();
      // Simple polling loop
      for (let i = 0; i < 5 && !["PAID", "SUCCESS", "FAILED", "CANCELED", "CANCELLED", "EXPIRED"].includes(nextStatus); i += 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const statusRes = await fetch(`/api/zb/status/${encodeURIComponent(pending.reference)}`, { cache: "no-store" });
        const statusData = await statusRes.json();
        nextStatus = String(statusData?.data?.status || "PENDING").toUpperCase();
      }

      setStatus(nextStatus);
      toast({
        title: nextStatus === "PAID" || nextStatus === "SUCCESS" ? "Payment successful" : "Payment update",
        description: `Reference: ${pending.reference}`,
      });

      if (nextStatus === "PAID" || nextStatus === "SUCCESS") {
        setPending(null);
        setOtp("");
      }
    } catch (error) {
      toast({ title: "Confirmation failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6 space-y-6 shadow-lg border-primary/10">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{serviceLabel} Details</Label>
          <div className="grid gap-4 p-4 border rounded-xl bg-muted/5">
            <div className="space-y-2">
              <Label htmlFor="account">Enter ID / Account Number</Label>
              <Input
                id="account"
                value={accountReference}
                onChange={(e) => setAccountReference(e.target.value)}
                placeholder="e.g. Meter / SmartCard / Phone"
                className="bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</Label>
          <RadioGroup
            onValueChange={(val: string) => {
              if (isPaymentMethod(val)) {
                setPaymentMethod(val);
              }
              setPending(null);
            }}
            defaultValue={paymentMethod}
            className="grid grid-cols-2 gap-2"
          >
            {[
              { id: "WALLETPLUS", label: "SmileCash" },
              { id: "ECOCASH", label: "EcoCash" },
              { id: "INNBUCKS", label: "Innbucks" },
              { id: "OMARI", label: "Omari" },
              { id: "CARD", label: "Bank Card" }
            ].map((m) => (
              <Label
                key={m.id}
                className={cn(
                  "flex items-center justify-center h-12 rounded-lg border-2 cursor-pointer transition-all text-xs font-bold",
                  paymentMethod === m.id ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"
                )}
              >
                <RadioGroupItem value={m.id} className="sr-only" />
                {m.label}
              </Label>
            ))}
          </RadioGroup>

          {!isCard && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="mobile">{paymentMethod} Number</Label>
              <div className="relative mt-1">
                <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobile"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="+263 7..."
                  className="pl-9"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {!pending ? (
        <Button
          disabled={loading || !accountReference || !amount || (!isCard && !customerMobile)}
          onClick={initiate}
          className="w-full h-12 text-lg shadow-md"
        >
          {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</> : "Purchase Now"}
        </Button>
      ) : (
        <div className="space-y-4 p-4 border-2 border-primary/20 rounded-xl bg-primary/5 animate-in zoom-in-95">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-primary font-bold">Verification Code (OTP)</Label>
            <Input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Enter 4-6 digit code"
              className="bg-background text-center text-xl tracking-widest h-12"
              autoFocus
            />
          </div>
          <Button disabled={loading || otp.length < 4} onClick={confirm} className="w-full h-12 shadow-lg">
            {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Verifying...</> : "Confirm Payment"}
          </Button>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span>Ref: {pending.reference}</span>
            <button onClick={() => setPending(null)} className="hover:text-foreground underline">Cancel</button>
          </div>
        </div>
      )}

      {status && !pending && (
        <div className={cn(
          "p-3 rounded-lg text-center text-sm font-bold",
          status === "SUCCESS" || status === "PAID" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
        )}>
          Status: {status}
        </div>
      )}
    </Card>
  );
}
