
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Smartphone } from "lucide-react";
import {
    getDefaultPaymentMethod,
    getEnabledPaymentMethodOptions,
    getPaymentMethodLabel,
    getPaymentMethodMobileHint,
    isPaymentMethod,
  requiresMobileNumber,
  type PaymentMethod,
} from "@/lib/payment-methods";
import type { CardPaymentDetails } from "@/lib/payments/types";
import {
    convertFromUsd,
    formatMoney,
    getCurrencyMeta,
    type CurrencyCode,
} from "@/lib/currency";

interface StepPaymentProps {
    onPay: (input: {
        amount: number;
        paymentMethod: PaymentMethod;
        mobile?: string;
        cardDetails?: CardPaymentDetails;
    }) => void;
    onBack: () => void;
    isLoading: boolean;
    currencyCode: CurrencyCode;
}

const enabledPaymentMethodOptions = getEnabledPaymentMethodOptions();
const defaultPaymentMethod = getDefaultPaymentMethod();

export function StepPayment({ onPay, onBack, isLoading, currencyCode }: StepPaymentProps) {
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod);
    const [mobile, setMobile] = useState("");
    const [cardPan, setCardPan] = useState("");
    const [cardExpMonth, setCardExpMonth] = useState("");
    const [cardExpYear, setCardExpYear] = useState("");
    const [cardSecurityCode, setCardSecurityCode] = useState("");
    const [error, setError] = useState("");
    const minimumAmount = convertFromUsd(2, currencyCode);
    const currencyMeta = getCurrencyMeta(currencyCode);

    useEffect(() => {
        if (!enabledPaymentMethodOptions.some(option => option.id === paymentMethod)) {
            setPaymentMethod(defaultPaymentMethod);
        }
    }, [paymentMethod]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount);
        if (isNaN(value) || value < minimumAmount) {
            setError(`Minimum purchase amount is ${formatMoney(minimumAmount, currencyCode)}`);
            return;
        }
        if (requiresMobileNumber(paymentMethod) && !mobile) {
            setError("Mobile number is required for mobile payments");
            return;
        }
        if (paymentMethod === "CARD" && (!cardPan || !cardExpMonth || !cardExpYear || !cardSecurityCode)) {
            setError("Complete all card details to continue.");
            return;
        }
        setError("");
        onPay({
            amount: value,
            paymentMethod,
            mobile,
            cardDetails: paymentMethod === "CARD" ? {
                pan: cardPan.replace(/\s/g, ""),
                expMonth: cardExpMonth,
                expYear: cardExpYear,
                securityCode: cardSecurityCode,
            } : undefined,
        });
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
                        <Label htmlFor="amount">Amount ({currencyMeta.label})</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{currencyMeta.symbol.trim()}</span>
                            <Input
                                id="amount"
                                type="number"
                                min={String(minimumAmount)}
                                step="0.01"
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
                            {enabledPaymentMethodOptions.map((m) => (
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

                    {paymentMethod === "CARD" && (
                        <div className="grid gap-4 rounded-xl border bg-muted/30 p-4 animate-in fade-in slide-in-from-top-2">
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
                            <div className="grid grid-cols-3 gap-3">
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
                        </div>
                    )}

                    <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        {paymentMethod === "CARD" 
                          ? "Your card is submitted directly to Smile Pay and may trigger a 3D Secure bank challenge before you return here." 
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
