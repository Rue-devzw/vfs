
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ZBService, CustomerDetails, TokenResponse } from "../services/zb-service";
import { StepMeterEntry } from "./StepMeterEntry";
import { StepVerification } from "./StepVerification";
import { StepPayment } from "./StepPayment";
import { StepReceipt } from "./StepReceipt";
import { ZesaSkeleton } from "./ZesaSkeleton";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    buildReceiptMessage,
    getPaymentProgressContent,
    isSuccessfulGatewayStatus,
    resolvePurchaseFlowAction,
    shouldContinueStatusPolling,
} from "@/lib/payment-flow";
import { getPaymentMethodLabel, type PaymentMethod } from "@/lib/payment-methods";

type Step = "METER" | "VERIFICATION" | "PAYMENT" | "OTP" | "RECEIPT";

export function ZesaFlow() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [step, setStep] = useState<Step>("METER");
    const [isLoading, setIsLoading] = useState(false);
    const [meterNumber, setMeterNumber] = useState("");
    const [customer, setCustomer] = useState<CustomerDetails | null>(null);
    const [receipt, setReceipt] = useState<TokenResponse | null>(null);
    const [otp, setOtp] = useState("");
    const [transactionReference, setTransactionReference] = useState("");
    const [localReference, setLocalReference] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("WALLETPLUS");
    const [customerMobile, setCustomerMobile] = useState("");

    const handleMeterSubmit = async (meter: string) => {
        setIsLoading(true);
        try {
            const details = await ZBService.validateMeter(meter);
            setMeterNumber(meter);
            setCustomer(details);
            setStep("VERIFICATION");
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to validate meter",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerificationConfirm = () => {
        setStep("PAYMENT");
    };

    const handleVerificationCancel = () => {
        setStep("METER");
        setCustomer(null);
        setMeterNumber("");
    };

    const pollStatus = useCallback(async (reference: string, fallbackAmount?: number, fallbackMeter?: string) => {
        let status = "PENDING";
        let vendedData: { token?: string; units?: number } | null = null;
        let resolvedAmount = fallbackAmount ?? 0;
        let resolvedMeter = fallbackMeter ?? meterNumber;
        let transactionReference: string | undefined;

        for (let attempt = 0; attempt < 12; attempt += 1) {
            try {
                const statusResult = await ZBService.checkStatus(reference);
                status = String(statusResult.status || "PENDING").toUpperCase();
                resolvedAmount = statusResult.amount ?? resolvedAmount;
                resolvedMeter = statusResult.meterNumber ?? resolvedMeter;
                transactionReference = statusResult.transactionReference ?? transactionReference;
                const rawVended = statusResult.vendedData;
                if (rawVended && typeof rawVended === "object") {
                    const candidate = rawVended as { token?: unknown; units?: unknown };
                    vendedData = {
                        token: typeof candidate.token === "string" ? candidate.token : undefined,
                        units: typeof candidate.units === "number" ? candidate.units : undefined,
                    };
                } else {
                    vendedData = null;
                }

                if (!shouldContinueStatusPolling(status, Boolean(vendedData?.token))) {
                    if (isSuccessfulGatewayStatus(status) && !vendedData?.token) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        continue;
                    }
                    break;
                }
            } catch (err) {
                console.error("Status check failed:", err);
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        setReceipt({
            amount: resolvedAmount,
            meterNumber: resolvedMeter,
            date: new Date().toISOString(),
            receiptNumber: reference,
            status,
            transactionReference,
            token: vendedData?.token,
            units: vendedData?.units,
            message: buildReceiptMessage(status, Boolean(vendedData?.token)),
        });
        setIsLoading(false);
        setStep("RECEIPT");
    }, [meterNumber]);

        const handlePayment = async (
        amount: number,
        method: PaymentMethod,
        mobile?: string,
    ) => {
        setIsLoading(true);
        setPaymentMethod(method);
        setCustomerMobile(mobile || "");
        try {
            if (!meterNumber) throw new Error("Meter number missing");
            const result = await ZBService.purchaseToken(meterNumber, amount, method, mobile);
            
            setLocalReference(result.reference);

            const action = resolvePurchaseFlowAction(result);
            const engagement = getPaymentProgressContent(result.status, {
                paymentMethod: method,
                subject: "your ZESA purchase",
            });
            if (action.type === "otp") {
                setTransactionReference(result.transactionReference);
                setStep("OTP");
                toast({
                    title: engagement.title,
                    description: result.message || engagement.description,
                });
                return;
            }

            if (action.type === "redirect") {
                window.location.href = action.url;
                return;
            }

            toast({
                title: engagement.title,
                description: result.message || engagement.description,
            });
            pollStatus(result.reference);
        } catch (error) {
            toast({
                title: "Payment Failed",
                description: error instanceof Error ? error.message : "Transaction failed",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmOtp = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/zb/checkout/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reference: localReference,
                    transactionReference,
                    otp,
                    paymentMethod,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "OTP confirmation failed");

            toast({
                title: "Confirmed",
                description: "Payment confirmed. Fetching your token...",
            });
            pollStatus(localReference);
        } catch (error) {
            toast({
                title: "Confirmation Failed",
                description: error instanceof Error ? error.message : "Failed to confirm OTP",
                variant: "destructive",
            });
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const reference = searchParams.get("reference");
        const status = searchParams.get("status");
        if (!reference) return;

        let ignore = false;
        setIsLoading(true);

        const syncFromReturn = async () => {
            try {
                await pollStatus(reference);
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
                    setIsLoading(false);
                    router.replace("/digital/zesa");
                }
            }
        };

        syncFromReturn();

        return () => {
            ignore = true;
        };
    }, [pollStatus, router, searchParams, toast]);

    const handleDone = () => {
        setStep("METER");
        setCustomer(null);
        setMeterNumber("");
        setReceipt(null);
        setIsLoading(false);
    };

    return (
        <Card className="w-full max-w-md bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-xl border-border/50">
            <div className="p-6">
                {isLoading ? (
                    <ZesaSkeleton />
                ) : (
                    <>
                        {step === "METER" && (
                            <StepMeterEntry onNext={handleMeterSubmit} isLoading={isLoading} />
                        )}
                        {step === "VERIFICATION" && customer && (
                            <StepVerification
                                customer={customer}
                                onConfirm={handleVerificationConfirm}
                                onCancel={handleVerificationCancel}
                            />
                        )}
                        {step === "PAYMENT" && (
                            <StepPayment
                                onPay={handlePayment}
                                onBack={() => setStep("VERIFICATION")}
                                isLoading={isLoading}
                            />
                        )}
                        {step === "OTP" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-bold">Secure Verification</h3>
                                    <p className="text-sm text-muted-foreground">
                                        We&apos;ve sent a code to your mobile device associated with {getPaymentMethodLabel(paymentMethod)} ({customerMobile}).
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="zesa-otp">Enter 6-digit OTP</Label>
                                        <Input
                                            id="zesa-otp"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            placeholder="000000"
                                            className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                                            maxLength={6}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => setStep("PAYMENT")}
                                            disabled={isLoading}
                                            className="flex-1"
                                        >
                                            Back
                                        </Button>
                                        <Button 
                                            onClick={handleConfirmOtp}
                                            disabled={isLoading || otp.length < 4}
                                            className="flex-[2] h-12 text-lg shadow-md"
                                        >
                                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify & Pay"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {step === "RECEIPT" && receipt && (
                            <StepReceipt receipt={receipt} onDone={handleDone} />
                        )}
                    </>
                )}
            </div>
        </Card>
    );
}
