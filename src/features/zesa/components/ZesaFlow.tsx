
"use client";

import { useState } from "react";
import { ZBService, CustomerDetails, TokenResponse } from "../services/zb-service";
import { StepMeterEntry } from "./StepMeterEntry";
import { StepVerification } from "./StepVerification";
import { StepPayment } from "./StepPayment";
import { StepReceipt } from "./StepReceipt";
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
            setReceipt(result);
            setStep("RECEIPT");
            toast({
                title: "Success",
                description: "Token purchased successfully!",
            });
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

    const handleDone = () => {
        setStep("METER");
        setCustomer(null);
        setMeterNumber("");
        setReceipt(null);
    };

    return (
        <Card className="w-full max-w-md bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-xl border-border/50">
            <div className="p-6">
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
            </div>
        </Card>
    );
}
