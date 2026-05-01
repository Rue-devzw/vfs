
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SmilePayService, CustomerDetails, TokenResponse } from "../services/smile-pay-service";
import { StepMeterEntry } from "./StepMeterEntry";
import { StepVerification } from "./StepVerification";
import { StepPayment } from "./StepPayment";
import { StepReceipt } from "./StepReceipt";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProcessStatusCard } from "@/components/ui/process-status-card";
import {
    buildReceiptMessage,
    getPaymentProgressContent,
    isSuccessfulGatewayStatus,
    resolvePurchaseFlowAction,
    shouldContinueStatusPolling,
} from "@/lib/payment-flow";
import { getDefaultPaymentMethod, getPaymentMethodLabel, type PaymentMethod } from "@/lib/payment-methods";
import { renderGatewayRedirectHtml } from "@/lib/payments/browser";
import type { CardPaymentDetails } from "@/lib/payments/types";
import { convertToUsd } from "@/lib/currency";
import { useCurrency } from "@/components/currency/currency-provider";

type Step = "METER" | "VERIFICATION" | "PAYMENT" | "OTP" | "RECEIPT";
type BackgroundProcessState = {
    title: string;
    description: string;
    detail?: string;
    progress: number;
};

export function ZesaFlow() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currencyCode } = useCurrency();
    const [step, setStep] = useState<Step>("METER");
    const [isLoading, setIsLoading] = useState(false);
    const [meterNumber, setMeterNumber] = useState("");
    const [customer, setCustomer] = useState<CustomerDetails | null>(null);
    const [receipt, setReceipt] = useState<TokenResponse | null>(null);
    const [otp, setOtp] = useState("");
    const [transactionReference, setTransactionReference] = useState("");
    const [localReference, setLocalReference] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(getDefaultPaymentMethod());
    const [customerMobile, setCustomerMobile] = useState("");
    const [processingState, setProcessingState] = useState<BackgroundProcessState | null>(null);

    const handleMeterSubmit = async (meter: string) => {
        setIsLoading(true);
        setProcessingState({
            title: "Validating meter number",
            description: "We are checking the meter ownership details with the provider.",
            detail: "This usually takes a few seconds. Keep this page open while we fetch the account information.",
            progress: 22,
        });
        try {
            const details = await SmilePayService.validateMeter(meter);
            setMeterNumber(meter);
            setCustomer(details);
            setStep("VERIFICATION");
        } catch (error) {
            setProcessingState(null);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to validate meter",
                variant: "destructive",
            });
        } finally {
            setProcessingState(null);
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
        let vendedData: (Partial<TokenResponse> & { message?: string; issue?: boolean }) | null = null;
        let resolvedAmount = fallbackAmount ?? 0;
        let resolvedCurrencyCode = currencyCode;
        let resolvedMeter = fallbackMeter ?? meterNumber;
        let transactionReference: string | undefined;

        setProcessingState({
            title: "Checking payment status",
            description: "Your payment request is active and we are waiting for the latest gateway update.",
            detail: "Approve any payment prompt on your phone, then stay on this page while we continue in the background.",
            progress: 64,
        });

        for (let attempt = 0; attempt < 12; attempt += 1) {
            try {
                const statusResult = await SmilePayService.checkStatus(reference);
                status = String(statusResult.status || "PENDING").toUpperCase();
                resolvedAmount = statusResult.amount ?? resolvedAmount;
                resolvedCurrencyCode = statusResult.currencyCode ?? resolvedCurrencyCode;
                resolvedMeter = statusResult.meterNumber ?? resolvedMeter;
                transactionReference = statusResult.transactionReference ?? transactionReference;
                const rawVended = statusResult.vendedData;
                if (rawVended && typeof rawVended === "object") {
                    const candidate = rawVended as {
                        token?: unknown;
                        units?: unknown;
                        receiptNumber?: unknown;
                        receiptDetails?: unknown;
                        message?: unknown;
                        issue?: unknown;
                    };
                    const receiptDetails = candidate.receiptDetails && typeof candidate.receiptDetails === "object"
                        ? candidate.receiptDetails as Record<string, unknown>
                        : {};
                    vendedData = {
                        token: typeof candidate.token === "string" ? candidate.token : undefined,
                        units: typeof candidate.units === "number" ? candidate.units : undefined,
                        receiptNumber: typeof candidate.receiptNumber === "string" ? candidate.receiptNumber : undefined,
                        receiptCurrencyCode: receiptDetails.receiptCurrencyCode === "924" ? "924" : receiptDetails.receiptCurrencyCode === "840" ? "840" : undefined,
                        customerName: typeof receiptDetails.customerName === "string" ? receiptDetails.customerName : undefined,
                        customerAddress: typeof receiptDetails.customerAddress === "string" ? receiptDetails.customerAddress : undefined,
                        receiptDate: typeof receiptDetails.receiptDate === "string" ? receiptDetails.receiptDate : undefined,
                        receiptTime: typeof receiptDetails.receiptTime === "string" ? receiptDetails.receiptTime : undefined,
                        tariffName: typeof receiptDetails.tariffName === "string" ? receiptDetails.tariffName : undefined,
                        tenderAmount: typeof receiptDetails.tenderAmount === "number" ? receiptDetails.tenderAmount : undefined,
                        energyCharge: typeof receiptDetails.energyCharge === "number" ? receiptDetails.energyCharge : undefined,
                        debtCollected: typeof receiptDetails.debtCollected === "number" ? receiptDetails.debtCollected : undefined,
                        levyPercent: typeof receiptDetails.levyPercent === "number" ? receiptDetails.levyPercent : undefined,
                        levyAmount: typeof receiptDetails.levyAmount === "number" ? receiptDetails.levyAmount : undefined,
                        vatPercent: typeof receiptDetails.vatPercent === "number" ? receiptDetails.vatPercent : undefined,
                        vatAmount: typeof receiptDetails.vatAmount === "number" ? receiptDetails.vatAmount : undefined,
                        totalPaid: typeof receiptDetails.totalPaid === "number" ? receiptDetails.totalPaid : undefined,
                        totalTendered: typeof receiptDetails.totalTendered === "number" ? receiptDetails.totalTendered : undefined,
                        message: typeof candidate.message === "string" ? candidate.message : undefined,
                        issue: candidate.issue === true,
                    };
                } else {
                    vendedData = null;
                }

                if (vendedData?.issue) {
                    setProcessingState({
                        title: "Fulfilment failed",
                        description: "Your payment went through, but token vending failed.",
                        detail: "We have stopped retrying automatically so the same vend request is not sent over and over.",
                        progress: 100,
                    });
                    break;
                }

                if (isSuccessfulGatewayStatus(status) && !vendedData?.token && !vendedData?.receiptNumber) {
                    setProcessingState({
                        title: "Payment confirmed",
                        description: "Your payment went through. We are now waiting for your token to be issued.",
                        detail: "Token vending can take a little longer than payment confirmation. Please keep this page open.",
                        progress: 90,
                    });
                } else {
                    const engagement = getPaymentProgressContent(status, {
                        paymentMethod,
                        subject: "your ZESA purchase",
                    });
                    setProcessingState({
                        title: engagement.title,
                        description: engagement.description,
                        detail: "We will move you to the receipt automatically as soon as the background work finishes.",
                        progress: status === "PROCESSING" ? 78 : 68,
                    });
                }

                if (!shouldContinueStatusPolling(status, Boolean(vendedData?.token || vendedData?.receiptNumber))) {
                    if (isSuccessfulGatewayStatus(status) && !vendedData?.token && !vendedData?.receiptNumber) {
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

        setProcessingState(null);
        setReceipt({
            amount: resolvedAmount,
            currencyCode: resolvedCurrencyCode,
            receiptCurrencyCode: vendedData?.receiptCurrencyCode,
            meterNumber: resolvedMeter,
            customerName: vendedData?.customerName || customer?.name,
            customerAddress: vendedData?.customerAddress || customer?.address,
            receiptDate: vendedData?.receiptDate,
            receiptTime: vendedData?.receiptTime,
            tariffName: vendedData?.tariffName,
            tenderAmount: vendedData?.tenderAmount,
            energyCharge: vendedData?.energyCharge,
            debtCollected: vendedData?.debtCollected,
            levyPercent: vendedData?.levyPercent,
            levyAmount: vendedData?.levyAmount,
            vatPercent: vendedData?.vatPercent,
            vatAmount: vendedData?.vatAmount,
            totalPaid: vendedData?.totalPaid,
            totalTendered: vendedData?.totalTendered,
            date: new Date().toISOString(),
            receiptNumber: vendedData?.receiptNumber || reference,
            status: vendedData?.issue ? "MANUAL_REVIEW" : status,
            transactionReference,
            token: vendedData?.token,
            units: vendedData?.units,
            message: vendedData?.message || buildReceiptMessage(status, Boolean(vendedData?.token || vendedData?.receiptNumber)),
            issue: vendedData?.issue,
        });
        setIsLoading(false);
        setStep("RECEIPT");
    }, [currencyCode, customer?.address, customer?.name, meterNumber, paymentMethod]);

        const handlePayment = async (input: {
        amount: number;
        paymentMethod: PaymentMethod;
        mobile?: string;
        cardDetails?: CardPaymentDetails;
    }) => {
        setIsLoading(true);
        setPaymentMethod(input.paymentMethod);
        setCustomerMobile(input.mobile || "");
        setProcessingState({
            title: "Preparing secure checkout",
            description: "We are creating your payment request and linking it to this meter number.",
            detail: "Once the gateway responds, we will either ask for an OTP, redirect you, or continue tracking automatically.",
            progress: 38,
        });
        try {
            if (!meterNumber) throw new Error("Meter number missing");
            const amountUsd = convertToUsd(input.amount, currencyCode);
            const result = await SmilePayService.purchaseToken(
                meterNumber,
                amountUsd,
                input.paymentMethod,
                input.mobile,
                input.cardDetails,
                currencyCode,
            );
            
            setLocalReference(result.reference);

            const action = resolvePurchaseFlowAction(result);
            const engagement = getPaymentProgressContent(result.status, {
                paymentMethod: input.paymentMethod,
                subject: "your ZESA purchase",
            });
            if (action.type === "otp") {
                setTransactionReference(result.transactionReference);
                setStep("OTP");
                setProcessingState(null);
                toast({
                    title: engagement.title,
                    description: result.message || engagement.description,
                });
                return;
            }

            if (action.type === "redirect") {
                setProcessingState({
                    title: "Redirecting to secure checkout",
                    description: "We are taking you to the Smile Pay page now.",
                    detail: "After payment, you will be sent back here automatically so we can keep checking the result.",
                    progress: 55,
                });
                window.location.href = action.url;
                return;
            }

            if (action.type === "html") {
                setProcessingState({
                    title: "Opening bank verification",
                    description: "We are handing you off to your bank's 3D Secure challenge now.",
                    detail: "Complete the challenge and you will be brought back here automatically.",
                    progress: 62,
                });
                renderGatewayRedirectHtml(action.html);
                return;
            }

            toast({
                title: engagement.title,
                description: result.message || engagement.description,
            });
            await pollStatus(result.reference, input.amount, meterNumber);
        } catch (error) {
            setProcessingState(null);
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
        setProcessingState({
            title: "Confirming OTP",
            description: "We are sending your verification code to the payment gateway now.",
            detail: "Once the gateway accepts it, we will continue tracking your payment and token in the background.",
            progress: 76,
        });
        try {
            const res = await fetch("/api/payments/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reference: localReference,
                    transactionReference,
                    otp,
                    paymentMethod,
                    customerMobile,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "OTP confirmation failed");

            toast({
                title: "Confirmed",
                description: "Payment confirmed. Fetching your token...",
            });
            await pollStatus(localReference);
        } catch (error) {
            setProcessingState(null);
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
                {processingState ? (
                    <ProcessStatusCard
                        title={processingState.title}
                        description={processingState.description}
                        detail={processingState.detail}
                        progress={processingState.progress}
                    />
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
                                    currencyCode={currencyCode}
                                    allowedCurrencyCodes={customer?.allowedCurrencyCodes}
                                    currencyRestrictionMessage={customer?.currencyRestrictionMessage}
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
