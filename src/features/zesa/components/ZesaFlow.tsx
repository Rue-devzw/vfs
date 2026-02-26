
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ZBService, CustomerDetails, TokenResponse } from "../services/zb-service";
import { StepMeterEntry } from "./StepMeterEntry";
import { StepVerification } from "./StepVerification";
import { StepPayment } from "./StepPayment";
import { StepReceipt } from "./StepReceipt";
import { ZesaSkeleton } from "./ZesaSkeleton";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

type Step = "METER" | "VERIFICATION" | "PAYMENT" | "RECEIPT";

export function ZesaFlow() {
    const { toast } = useToast();
    const [step, setStep] = useState<Step>("METER");
    const [isLoading, setIsLoading] = useState(false);
    const [meterNumber, setMeterNumber] = useState("");
    const [customer, setCustomer] = useState<CustomerDetails | null>(null);
    const [receipt, setReceipt] = useState<TokenResponse | null>(null);

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const action = searchParams.get("action");
        if (action === "mock-zb-flow") {
            const amount = Number(searchParams.get("amount"));
            const meter = searchParams.get("meter") || "Unknown";
            const ref = searchParams.get("ref") || "Unknown";

            const token = Array.from({ length: 4 }, () =>
                Math.floor(Math.random() * 90000 + 10000).toString()
            ).join(" ");

            setReceipt({
                token,
                units: Number((amount * 0.15).toFixed(2)),
                amount,
                meterNumber: meter,
                date: new Date().toISOString(),
                receiptNumber: ref,
            });
            setStep("RECEIPT");
            router.replace("/store/zesa-tokens");
        }
    }, [searchParams, router]);

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

    const handlePayment = async (amount: number) => {
        setIsLoading(true);
        try {
            if (!meterNumber) throw new Error("Meter number missing");
            const result = await ZBService.purchaseToken(meterNumber, amount);
            window.location.href = result.redirectUrl;
        } catch (error) {
            toast({
                title: "Payment Failed",
                description: error instanceof Error ? error.message : "Transaction failed",
                variant: "destructive",
            });
            setIsLoading(false);
        }
    };

    const handleDone = () => {
        setStep("METER");
        setCustomer(null);
        setMeterNumber("");
        setReceipt(null);
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
                        {step === "RECEIPT" && receipt && (
                            <StepReceipt receipt={receipt} onDone={handleDone} />
                        )}
                    </>
                )}
            </div>
        </Card>
    );
}
