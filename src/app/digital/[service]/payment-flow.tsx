"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProcessStatusCard } from "@/components/ui/process-status-card";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DigitalServiceField } from "@/lib/digital-services";
import {
  getDefaultPaymentMethod,
  getEnabledPaymentMethodOptions,
  getPaymentMethodLabel,
  getPaymentMethodMobileHint,
  isPaymentMethod,
  requiresMobileNumber,
  type PaymentMethod,
} from "@/lib/payment-methods";
import { renderGatewayRedirectHtml } from "@/lib/payments/browser";
import { getPaymentProgressContent, resolvePurchaseFlowAction } from "@/lib/payment-flow";
import {
  convertFromUsd,
  convertToUsd,
  formatMoney,
  getCurrencyMeta,
  type CurrencyCode,
} from "@/lib/currency";
import { useCurrency } from "@/components/currency/currency-provider";

type DigitalReceipt = {
  reference: string;
  status: string;
  amount?: number;
  currencyCode?: CurrencyCode;
  transactionReference?: string;
  manualReview?: boolean;
  message: string;
};

type BackgroundProcessState = {
  title: string;
  description: string;
  detail?: string;
  progress: number;
};

const enabledPaymentMethodOptions = getEnabledPaymentMethodOptions();
const defaultPaymentMethod = getDefaultPaymentMethod();

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
  const { currencyCode } = useCurrency();
  const [accountReference, setAccountReference] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [cardPan, setCardPan] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardSecurityCode, setCardSecurityCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod);
  const [loading, setLoading] = useState(false);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [receipt, setReceipt] = useState<DigitalReceipt | null>(null);
  const [serviceMeta, setServiceMeta] = useState<Record<string, string>>({});
  const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod);
  const [processingState, setProcessingState] = useState<BackgroundProcessState | null>(null);
  const minimumAmount = convertFromUsd(1, currencyCode);

  const isAvailable = availabilityStatus === "active";

  useEffect(() => {
    if (!enabledPaymentMethodOptions.some(option => option.id === paymentMethod)) {
      setPaymentMethod(defaultPaymentMethod);
    }
  }, [paymentMethod]);

  const checkStatus = useCallback(async (reference: string) => {
    let latestStatus = "PENDING";
    let latestAmount: number | undefined;
    let latestCurrencyCode: CurrencyCode | undefined;
    let latestGatewayReference: string | undefined;
    let manualReview = false;
    let statusMessage: string | undefined;

    setProcessingState({
      title: "Checking payment status",
      description: `We are waiting for the latest ${serviceLabel} payment update.`,
      detail: "Keep this page open while we confirm the gateway result and save your request.",
      progress: 68,
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await fetch(`/api/payments/status/${encodeURIComponent(reference)}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to check payment status");
      }

      latestStatus = String(data.data?.status || "PENDING").toUpperCase();
      latestAmount = typeof data.data?.amount === "number" ? data.data.amount : latestAmount;
      latestCurrencyCode = data.data?.currencyCode === "924" ? "924" : data.data?.currencyCode === "840" ? "840" : latestCurrencyCode;
      latestGatewayReference = typeof data.data?.transactionReference === "string"
        ? data.data.transactionReference
        : latestGatewayReference;
      const rawVendedData = data.data?.vendedData;
      if (rawVendedData && typeof rawVendedData === "object") {
        const candidate = rawVendedData as { manualReview?: unknown; issue?: unknown; message?: unknown };
        manualReview = candidate.manualReview === true || candidate.issue === true;
        statusMessage = typeof candidate.message === "string" ? candidate.message : statusMessage;
      }
      if (typeof data.data?.accountReference === "string") {
        setAccountReference((current) => current || data.data.accountReference);
      }

      const engagement = getPaymentProgressContent(latestStatus, {
        paymentMethod: activePaymentMethod,
        subject: `${serviceLabel} payment`,
        manualReview: true,
      });
      const progress = ["PAID", "SUCCESS"].includes(latestStatus)
        ? 92
        : latestStatus === "PROCESSING"
          ? 82
          : 72;
      setProcessingState({
        title: engagement.title,
        description: engagement.description,
        detail: manualReview
          ? "Payment is confirmed and the request is now waiting for fulfilment confirmation."
          : ["PAID", "SUCCESS"].includes(latestStatus)
          ? "Payment is confirmed. We are recording the request so you can track it from your account."
          : "Your request is active in the background. Approval can happen on your device or at the gateway.",
        progress,
      });

      if (manualReview) {
        break;
      }

      if (["PAID", "SUCCESS", "FAILED", "CANCELED", "CANCELLED", "EXPIRED"].includes(latestStatus)) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const engagement = getPaymentProgressContent(latestStatus, {
      paymentMethod: activePaymentMethod,
      subject: `${serviceLabel} payment`,
      manualReview: true,
    });
    setProcessingState(null);
    setReceipt({
      reference,
      status: manualReview ? "MANUAL_REVIEW" : latestStatus,
      amount: latestAmount,
      currencyCode: latestCurrencyCode ?? currencyCode,
      transactionReference: latestGatewayReference,
      manualReview,
      message: statusMessage || engagement.description,
    });
  }, [activePaymentMethod, currencyCode, serviceLabel]);

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
          amount: convertToUsd(Number(amount), currencyCode),
          currencyCode,
          paymentMethod,
          customerMobile: paymentMethod === "CARD" ? undefined : (customerMobile || undefined),
          cardDetails: paymentMethod === "CARD" ? {
            pan: cardPan.replace(/\s/g, ""),
            expMonth: cardExpMonth,
            expYear: cardExpYear,
            securityCode: cardSecurityCode,
          } : undefined,
          serviceMeta,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to initiate payment");

      setActivePaymentMethod(paymentMethod);
      setProcessingState({
        title: "Preparing payment request",
        description: `We are creating your ${serviceLabel} payment request now.`,
        detail: "This includes opening the secure payment session and saving a trackable order reference.",
        progress: 35,
      });
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
        setProcessingState(null);
        toast({
          title: engagement.title,
          description: data.message || engagement.description,
        });
        return;
      }

      if (action.type === "redirect") {
        setProcessingState({
          title: "Redirecting to secure checkout",
          description: "We are sending you to the payment gateway now.",
          detail: "After payment, you will return here automatically so we can continue tracking the result.",
          progress: 55,
        });
        window.location.href = action.url;
        return;
      }

      if (action.type === "html") {
        setProcessingState({
          title: "Opening bank verification",
          description: "We are handing you off to your bank's secure 3D Secure challenge.",
          detail: "Complete the challenge and you will be returned here automatically.",
          progress: 62,
        });
        renderGatewayRedirectHtml(action.html);
        return;
      }

      setOrderReference(data.reference);
      toast({
        title: engagement.title,
        description: data.message || engagement.description,
      });
      await checkStatus(data.reference);
    } catch (error) {
      setProcessingState(null);
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
      setProcessingState({
        title: "Confirming your OTP",
        description: "We are submitting the verification code to the payment gateway.",
        detail: "Please wait while we confirm the payment result in the background.",
        progress: 74,
      });
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: orderReference,
          transactionReference,
          otp,
          paymentMethod,
          customerMobile,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "OTP confirmation failed");

      toast({
        title: "OTP Confirmed",
        description: data.message || "Payment processed. Checking fulfillment status...",
      });
      setAwaitingOtp(false);
      await checkStatus(orderReference);
    } catch (error) {
      setProcessingState(null);
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
          <div className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
            receipt.manualReview ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary",
          )}>
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
              <span className="font-medium">{formatMoney(receipt.amount, receipt.currencyCode ?? currencyCode)}</span>
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

  if (processingState) {
    return (
      <Card className="w-full max-w-md mx-auto p-6 shadow-lg border-primary/10">
        <ProcessStatusCard
          title={processingState.title}
          description={processingState.description}
          detail={processingState.detail}
          progress={processingState.progress}
        />
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
                    <Label htmlFor="amount">Amount ({getCurrencyMeta(currencyCode).label})</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">{getCurrencyMeta(currencyCode).symbol.trim()}</span>
                      <Input
                        id="amount"
                        type="number"
                        min={String(minimumAmount)}
                        step="0.01"
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
                  {enabledPaymentMethodOptions.map((m) => (
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

              {paymentMethod === "CARD" && (
                <div className="grid gap-4 rounded-xl border bg-muted/5 p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label htmlFor="card-pan">Card Number</Label>
                    <Input
                      id="card-pan"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={cardPan}
                      onChange={(e) => setCardPan(e.target.value.replace(/\D/g, ""))}
                      placeholder="2223 0000 0000 0007"
                      className="bg-background"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="card-exp-month">Exp Month</Label>
                      <Input
                        id="card-exp-month"
                        inputMode="numeric"
                        autoComplete="cc-exp-month"
                        value={cardExpMonth}
                        onChange={(e) => setCardExpMonth(e.target.value.replace(/\D/g, ""))}
                        placeholder="01"
                        maxLength={2}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-exp-year">Exp Year</Label>
                      <Input
                        id="card-exp-year"
                        inputMode="numeric"
                        autoComplete="cc-exp-year"
                        value={cardExpYear}
                        onChange={(e) => setCardExpYear(e.target.value.replace(/\D/g, ""))}
                        placeholder="39"
                        maxLength={4}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-security-code">CVV</Label>
                      <Input
                        id="card-security-code"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        value={cardSecurityCode}
                        onChange={(e) => setCardSecurityCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="100"
                        maxLength={4}
                        className="bg-background"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    If your bank requires 3D Secure, the challenge will open automatically and return you here once complete.
                  </p>
                </div>
              )}

              <Button
                disabled={
                  loading
                  || !isAvailable
                  || !accountReference
                  || !amount
                  || (requiresMobileNumber(paymentMethod) && !customerMobile)
                  || (paymentMethod === "CARD" && (!cardPan || !cardExpMonth || !cardExpYear || !cardSecurityCode))
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
