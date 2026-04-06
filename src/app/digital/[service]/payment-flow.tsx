"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DigitalServiceField } from "@/lib/digital-services";
import {
  getPaymentMethodLabel,
  getPaymentMethodMobileHint,
  isPaymentMethod,
  PAYMENT_METHOD_OPTIONS,
  requiresMobileNumber,
  type PaymentMethod,
} from "@/lib/payment-methods";
import { getPaymentProgressContent, isSuccessfulGatewayStatus, resolvePurchaseFlowAction } from "@/lib/payment-flow";

type DigitalReceipt = {
  reference: string;
  status: string;
  amount?: number;
  transactionReference?: string;
  message: string;
};

export function GenericDigitalFlow({
  service,
  serviceLabel,
  accountLabel,
  availabilityStatus,
  supportMessage,
  formFields = [],
}: {
  service: string;
  serviceLabel: string;
  accountLabel: string;
  availabilityStatus: "active" | "coming_soon";
  supportMessage?: string;
  formFields?: DigitalServiceField[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountReference, setAccountReference] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("WALLETPLUS");
  const [loading, setLoading] = useState(false);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [receipt, setReceipt] = useState<DigitalReceipt | null>(null);
  const [serviceMeta, setServiceMeta] = useState<Record<string, string>>({});
  const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethod>("WALLETPLUS");

  const isAvailable = availabilityStatus === "active";

  const checkStatus = useCallback(async (reference: string) => {
    let latestStatus = "PENDING";
    let latestAmount: number | undefined;
    let latestGatewayReference: string | undefined;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await fetch(`/api/zb/status/${encodeURIComponent(reference)}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to check payment status");
      }

      latestStatus = String(data.data?.status || "PENDING").toUpperCase();
      latestAmount = typeof data.data?.amount === "number" ? data.data.amount : latestAmount;
      latestGatewayReference = typeof data.data?.transactionReference === "string"
        ? data.data.transactionReference
        : latestGatewayReference;
      if (typeof data.data?.accountReference === "string") {
        setAccountReference((current) => current || data.data.accountReference);
      }

      if (["PAID", "SUCCESS", "FAILED", "CANCELED", "CANCELLED", "EXPIRED"].includes(latestStatus)) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const isSuccess = isSuccessfulGatewayStatus(latestStatus);
    const engagement = getPaymentProgressContent(latestStatus, {
      paymentMethod: activePaymentMethod,
      subject: `${serviceLabel} payment`,
      manualReview: true,
    });
    setReceipt({
      reference,
      status: latestStatus,
      amount: latestAmount,
      transactionReference: latestGatewayReference,
      message: isSuccess
        ? engagement.description
        : engagement.description,
    });
  }, [activePaymentMethod, serviceLabel]);

  useEffect(() => {
    const reference = searchParams.get("reference");
    const status = searchParams.get("status");
    if (!reference) return;

    let ignore = false;
    setLoading(true);

    const syncFromReturn = async () => {
      try {
        await checkStatus(reference);
        if (status && ["FAILED", "CANCELED", "CANCELLED"].includes(status.toUpperCase())) {
          toast({
            title: "Payment Update",
            description: `Gateway returned ${status}. The latest status has been refreshed.`,
          });
        }
      } catch (error) {
        if (!ignore) {
          toast({
            title: "Status Check Failed",
            description: error instanceof Error ? error.message : "Unable to refresh payment status.",
            variant: "destructive",
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          router.replace(`/digital/${service}`);
        }
      }
    };

    syncFromReturn();

    return () => {
      ignore = true;
    };
  }, [checkStatus, router, searchParams, service, toast]);

  const initiate = async () => {
    setLoading(true);
    try {
      if (!isAvailable) {
        throw new Error(supportMessage || `${serviceLabel} is not available yet.`);
      }
      const res = await fetch("/api/digital/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: service.toUpperCase(),
          accountNumber: accountReference,
          amount: Number(amount),
          paymentMethod,
          customerMobile,
          serviceMeta,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to initiate payment");

      setActivePaymentMethod(paymentMethod);
      const action = resolvePurchaseFlowAction(data);
      const engagement = getPaymentProgressContent(data.status, {
        paymentMethod,
        subject: `${serviceLabel} payment`,
        manualReview: true,
      });

      if (action.type === "otp") {
        setTransactionReference(data.transactionReference);
        setOrderReference(data.reference);
        setAwaitingOtp(true);
        toast({
          title: engagement.title,
          description: data.message || engagement.description,
        });
        return;
      }

      if (action.type === "redirect") {
        window.location.href = action.url;
        return;
      }

      setOrderReference(data.reference);
      toast({
        title: engagement.title,
        description: data.message || engagement.description,
      });
      checkStatus(data.reference);
    } catch (error) {
      toast({
        title: "Initiation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/zb/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: orderReference,
          transactionReference,
          otp,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "OTP confirmation failed");

      toast({
        title: "OTP Confirmed",
        description: data.message || "Payment processed. Checking fulfillment status...",
      });
      setAwaitingOtp(false);
      checkStatus(orderReference);
    } catch (error) {
      toast({
        title: "Confirmation failed",
        description: error instanceof Error ? error.message : "Confirmation failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (receipt) {
    return (
      <Card className="w-full max-w-md mx-auto p-6 space-y-6 shadow-lg border-primary/10">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-semibold">Payment Update</h2>
          <p className="text-sm text-muted-foreground">{receipt.message}</p>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Service</span>
            <span className="font-medium">{serviceLabel}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Status</span>
            <span className="font-semibold">{receipt.status}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">{accountLabel}</span>
            <span className="font-medium">{accountReference || "Submitted in request"}</span>
          </div>
          {typeof receipt.amount === "number" ? (
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">${receipt.amount.toFixed(2)}</span>
            </div>
          ) : null}
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Reference</span>
            <span className="font-mono text-xs">{receipt.reference}</span>
          </div>
          {receipt.transactionReference ? (
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Gateway Ref</span>
              <span className="font-mono text-xs">{receipt.transactionReference}</span>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {getPaymentProgressContent(receipt.status, {
            paymentMethod: activePaymentMethod,
            subject: `${serviceLabel} request`,
            manualReview: true,
          }).description} You can track progress from your account once signed in.
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setReceipt(null);
              setAccountReference("");
              setAmount("");
              setServiceMeta({});
            }}
          >
            New Request
          </Button>
          <Button className="flex-[2]" onClick={() => router.push("/account")}>
            Open My Account
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6 space-y-6 shadow-lg border-primary/10">
      <div className="space-y-4">
        {!isAvailable && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {supportMessage || `${serviceLabel} is not available yet.`}
          </div>
        )}
        {isAvailable && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            {awaitingOtp 
              ? "Please enter the OTP sent to your phone to complete the transaction." 
              : `Pay with ${getPaymentMethodLabel(paymentMethod)}. After payment, the request is tracked in the system and moves into manual processing confirmation.`}
          </div>
        )}
        <div className="space-y-4">
          {awaitingOtp ? (
            <div className="space-y-4 p-4 border rounded-xl bg-muted/5">
              <div className="space-y-2 text-center">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Security Check</Label>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-2">
                  <Loader2 className="h-6 w-6 animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground">Verification code sent to {customerMobile}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Enter 6-digit OTP</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  className="bg-background text-center text-2xl tracking-[0.5em] font-mono h-14"
                  maxLength={6}
                />
              </div>
              <Button 
                onClick={confirmOtp} 
                disabled={loading || otp.length < 4}
                className="w-full h-12 text-lg shadow-md"
              >
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Verifying...</> : "Confirm Payment"}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setAwaitingOtp(false)} 
                disabled={loading}
                className="w-full text-xs text-muted-foreground"
              >
                Cancel and try again
              </Button>
            </div>
          ) : (
            <>
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{serviceLabel} Details</Label>
              <div className="grid gap-4 p-4 border rounded-xl bg-muted/5">
                <div className="space-y-2">
                  <Label htmlFor="account">{accountLabel}</Label>
                  <Input
                    id="account"
                    value={accountReference}
                    onChange={(e) => setAccountReference(e.target.value)}
                    placeholder="Enter your account reference"
                    className="bg-background"
                  />
                </div>
                {formFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <Input
                      id={field.id}
                      type={field.type === "number" ? "number" : "text"}
                      min={field.type === "number" ? "1" : undefined}
                      value={serviceMeta[field.id] ?? ""}
                      onChange={(e) => setServiceMeta((current) => ({ ...current, [field.id]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="bg-background"
                    />
                    {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
                  </div>
                ))}
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

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</Label>
                <RadioGroup
                  onValueChange={(val: string) => {
                    if (isPaymentMethod(val)) {
                      setPaymentMethod(val);
                    }
                  }}
                  defaultValue={paymentMethod}
                  className="grid grid-cols-2 gap-2"
                >
                  {PAYMENT_METHOD_OPTIONS.map((m) => (
                    <Label
                      key={m.id}
                      className={cn(
                        "flex items-center justify-center h-12 rounded-lg border-2 cursor-pointer transition-all text-xs font-bold",
                        paymentMethod === m.id ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30",
                      )}
                    >
                      <RadioGroupItem value={m.id} className="sr-only" />
                      {m.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {requiresMobileNumber(paymentMethod) && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="mobile">Mobile Number (Payment)</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">{getPaymentMethodMobileHint(paymentMethod)}</p>
                </div>
              )}

              <Button
                disabled={
                  loading
                  || !isAvailable
                  || !accountReference
                  || !amount
                  || (requiresMobileNumber(paymentMethod) && !customerMobile)
                  || formFields.some(field => field.required && !(serviceMeta[field.id] ?? "").trim())
                }
                onClick={initiate}
                className="w-full h-12 text-lg shadow-md"
              >
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Redirecting...</> : "Proceed to Payment"}
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
