
"use client";

import { useState } from "react";
import { ZBService, CustomerDetails, TokenResponse } from "../services/zb-service";
import { StepMeterEntry } from "./StepMeterEntry";
import { StepVerification } from "./StepVerification";
import { StepPayment } from "./StepPayment";
import { StepOtp } from "./StepOtp";
import { StepReceipt } from "./StepReceipt";
import { ZesaSkeleton } from "./ZesaSkeleton";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

type Step = "METER" | "VERIFICATION" | "PAYMENT" | "OTP" | "RECEIPT";

export function ZesaFlow() {
    const { toast } = useToast();
    const [step, setStep] = useState<Step>("METER");
    const [isLoading, setIsLoading] = useState(false);
    const [meterNumber, setMeterNumber] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"WALLETPLUS" | "ECOCASH" | "INNBUCKS" | "OMARI" | "CARD">("WALLETPLUS");
    const [customer, setCustomer] = useState<CustomerDetails | null>(null);
    const [receipt, setReceipt] = useState<TokenResponse | null>(null);
    const [pendingPayment, setPendingPayment] = useState<{
        amount: number;
        reference: string;
        transactionReference: string;
    } | null>(null);

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

    const pollStatus = async (reference: string, amount: number, gatewayRef: string) => {
        let status = "PENDING";
        for (let attempt = 0; attempt < 12; attempt += 1) {
            const statusResult = await ZBService.checkStatus(reference);
            status = String(statusResult.status || "PENDING").toUpperCase();
            if (["PAID", "SUCCESS", "FAILED", "CANCELED", "CANCELLED", "EXPIRED"].includes(status)) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        setReceipt({
            amount,
            meterNumber,
            date: new Date().toISOString(),
            receiptNumber: reference,
            status,
            transactionReference: gatewayRef,
            message: status === "PAID" || status === "SUCCESS"
                ? "Payment completed successfully."
                : "Payment confirmation is pending or requires support follow-up.",
        });
        setStep("RECEIPT");
    };

    const handlePayment = async (
        amount: number,
        method: "WALLETPLUS" | "ECOCASH" | "INNBUCKS" | "OMARI" | "CARD",
        customerMobile?: string
    ) => {
        setIsLoading(true);
        setPaymentMethod(method);
        try {
            if (!meterNumber) throw new Error("Meter number missing");
            const result = await ZBService.purchaseToken(meterNumber, amount, method, customerMobile);

            if (method === "CARD" && result.paymentUrl) {
                window.location.href = result.paymentUrl;
                return;
            }

            setPendingPayment({
                amount,
                reference: result.reference,
                transactionReference: result.transactionReference,
            });

            if (method === "WALLETPLUS" || method === "OMARI") {
                setStep("OTP");
                toast({
                    title: "OTP Sent",
                    description: result.message || "Enter the OTP sent to your account.",
                });
            } else {
                // USSD push methods (Ecocash/Innbucks)
                toast({
                    title: "Payment Requested",
                    description: "Check your phone for a USSD prompt to complete payment.",
                });
                await pollStatus(result.reference, amount, result.transactionReference);
            }
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

    const handleOtpConfirm = async (otp: string) => {
        if (!pendingPayment) return;
        setIsLoading(true);
        try {
            const result = await ZBService.confirmTokenPayment(
                pendingPayment.reference,
                pendingPayment.transactionReference,
                otp,
                paymentMethod
            );

            const immediateStatus = String(result.status || "PENDING").toUpperCase();
            if (["PAID", "SUCCESS", "FAILED", "CANCELED", "CANCELLED", "EXPIRED"].includes(immediateStatus)) {
                setReceipt({
                    amount: pendingPayment.amount,
                    meterNumber,
                    date: new Date().toISOString(),
                    receiptNumber: pendingPayment.reference,
                    status: immediateStatus,
                    transactionReference: pendingPayment.transactionReference,
                    message: immediateStatus === "PAID" || immediateStatus === "SUCCESS"
                        ? "Payment completed successfully."
                        : "Payment was not completed.",
                });
                setStep("RECEIPT");
                return;
            }

            await pollStatus(
                pendingPayment.reference,
                pendingPayment.amount,
                pendingPayment.transactionReference,
            );
        } catch (error) {
            toast({
                title: "OTP Confirmation Failed",
                description: error instanceof Error ? error.message : "Failed to confirm OTP.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDone = () => {
        setStep("METER");
        setCustomer(null);
        setMeterNumber("");
        setReceipt(null);
        setPendingPayment(null);
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
                            <StepOtp
                                onConfirm={handleOtpConfirm}
                                onBack={() => setStep("PAYMENT")}
                                isLoading={isLoading}
                            />
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
