
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";

interface StepMeterEntryProps {
    onNext: (meterNumber: string) => void;
    isLoading: boolean;
}

export function StepMeterEntry({ onNext, isLoading }: StepMeterEntryProps) {
    const [meterNumber, setMeterNumber] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (meterNumber.length < 7) {
            setError("Please enter a valid meter number.");
            return;
        }
        setError("");
        onNext(meterNumber);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Zap className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold">Enter Meter Number</h2>
                <p className="text-sm text-muted-foreground">
                    Enter your 11-digit ZESA prepaid meter number to continue.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="meter">Meter Number</Label>
                    <Input
                        id="meter"
                        placeholder="e.g. 1234 5678 901"
                        value={meterNumber}
                        onChange={(e) => {
                            // Allow only numbers and spaces
                            const val = e.target.value.replace(/[^0-9\s]/g, "");
                            setMeterNumber(val);
                            setError("");
                        }}
                        className="text-lg tracking-widest"
                        maxLength={15}
                        disabled={isLoading}
                        autoFocus
                    />
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || !meterNumber}>
                    {isLoading ? "Verifying..." : "Verify Meter"}
                </Button>
            </form>

            <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
                <p>
                    <strong>Tip:</strong> Double-check the number on your meter card or
                    previous token receipt.
                </p>
            </div>
        </div>
    );
}
