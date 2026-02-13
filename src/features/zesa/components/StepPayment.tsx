
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet } from "lucide-react";

interface StepPaymentProps {
    onPay: (amount: number) => void;
    onBack: () => void;
    isLoading: boolean;
}

export function StepPayment({ onPay, onBack, isLoading }: StepPaymentProps) {
    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount);
        if (isNaN(value) || value < 2) {
            setError("Minimum purchase amount is $2.00");
            return;
        }
        setError("");
        onPay(value);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Wallet className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold">Enter Amount</h2>
                <p className="text-sm text-muted-foreground">
                    How much electricity would you like to buy?
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
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
                            className="pl-7 text-lg"
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>

                <div className="flex gap-3">
                    <Button type="button" variant="secondary" onClick={onBack} disabled={isLoading} className="flex-1">
                        Back
                    </Button>
                    <Button type="submit" disabled={isLoading || !amount} className="flex-[2]">
                        {isLoading ? "Processing..." : "Buy Token"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
