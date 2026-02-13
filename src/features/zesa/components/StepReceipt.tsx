
import { Button } from "@/components/ui/button";
import { Check, Copy, Download } from "lucide-react";
import { TokenResponse } from "../services/zb-service";
import { useState } from "react";

interface StepReceiptProps {
    receipt: TokenResponse;
    onDone: () => void;
}

export function StepReceipt({ receipt, onDone }: StepReceiptProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(receipt.token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-lg animate-in zoom-in spin-in-3">
                    <Check className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Payment Successful!</h2>
                <p className="text-muted-foreground">Here is your ZESA token.</p>
            </div>

            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="bg-muted/30 p-6 text-center">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Token Number</span>
                    <div className="mt-2 flex items-center justify-center gap-2">
                        <code className="text-3xl font-bold tracking-widest text-primary font-mono select-all">
                            {receipt.token}
                        </code>
                        <Button size="icon" variant="ghost" onClick={handleCopy} className="h-8 w-8 rounded-full">
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
                <div className="divide-y p-6 text-sm">
                    <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Units</span>
                        <span className="font-medium">{receipt.units} kWh</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Amount Paid</span>
                        <span className="font-medium">${receipt.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Meter Number</span>
                        <span className="font-mono">{receipt.meterNumber}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Receipt #</span>
                        <span className="font-mono">{receipt.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Date</span>
                        <span>{new Date(receipt.date).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2">
                    <Download className="h-4 w-4" /> Download
                </Button>
                <Button onClick={onDone} className="flex-[2]">
                    Done
                </Button>
            </div>
        </div>
    );
}
