
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Smartphone } from "lucide-react";
import {
    getPaymentMethodLabel,
    getPaymentMethodMobileHint,
    isPaymentMethod,
    PAYMENT_METHOD_OPTIONS,
    requiresMobileNumber,
    type PaymentMethod,
} from "@/lib/payment-methods";

interface StepPaymentProps {
    onPay: (amount: number, paymentMethod: PaymentMethod, mobile?: string) => void;
    onBack: () => void;
    isLoading: boolean;
}

export function StepPayment({ onPay, onBack, isLoading }: StepPaymentProps) {
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("WALLETPLUS");
    const [mobile, setMobile] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount);
        if (isNaN(value) || value < 2) {
            setError("Minimum purchase amount is $2.00");
            return;
        }
        if (requiresMobileNumber(paymentMethod) && !mobile) {
            setError("Mobile number is required for mobile payments");
            return;
        }
        setError("");
        onPay(value, paymentMethod, mobile);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Smartphone className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold">Complete Payment</h2>
                <p className="text-sm text-muted-foreground">
                    Select your payment method and continue to secure checkout.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (USD)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                            <Input
                                id="amount"
                                type="number"
                                min="2"
                                step="1"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError("");
                                }}
                                className="pl-7 text-lg font-bold"
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Select Payment Method</Label>
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
                                        "flex items-center justify-center h-12 rounded-lg border-2 cursor-pointer transition-all text-xs font-bold text-center",
                                        paymentMethod === m.id ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/20"
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
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                placeholder="07XX XXX XXX"
                                className="bg-background"
                                />
                             <p className="text-[10px] text-muted-foreground">{getPaymentMethodMobileHint(paymentMethod)}</p>
                        </div>
                    )}

                    <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        {paymentMethod === "CARD" 
                          ? "Valley Farm Digital uses standard checkout. You will finish payment on the secure ZB payment page." 
                          : `You may be prompted to approve or verify the payment on your mobile device for ${getPaymentMethodLabel(paymentMethod)}.`}
                    </div>
                    {error && <p className="text-sm text-destructive font-medium text-center">{error}</p>}
                </div>

                <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={onBack} disabled={isLoading} className="flex-1 h-12">
                        Back
                    </Button>
                    <Button type="submit" disabled={isLoading || !amount} className="flex-[2] h-12 text-lg shadow-lg">
                        {isLoading ? "Processing..." : "Continue to Secure Checkout"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
