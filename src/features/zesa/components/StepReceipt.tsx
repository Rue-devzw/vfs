
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
        if (!receipt.token) return;
        navigator.clipboard.writeText(receipt.token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const lines = [
            `Status: ${receipt.status}`,
            receipt.token ? `Token: ${receipt.token}` : null,
            typeof receipt.units === "number" ? `Units: ${receipt.units} kWh` : null,
            `Amount Paid: $${receipt.amount.toFixed(2)}`,
            `Meter Number: ${receipt.meterNumber}`,
            `Receipt: ${receipt.receiptNumber}`,
            receipt.transactionReference ? `Gateway Ref: ${receipt.transactionReference}` : null,
            `Date: ${new Date(receipt.date).toISOString()}`,
        ].filter(Boolean);

        const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `zesa-${receipt.receiptNumber}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-lg animate-in zoom-in spin-in-3">
                    <Check className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Payment Update</h2>
                <p className="text-muted-foreground">{receipt.message || "Transaction processed through WalletPlus."}</p>
            </div>

            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="bg-muted/30 p-6 text-center">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {receipt.token ? "Electricity Token" : "Transaction Status"}
                    </span>
                    <div className="mt-2 flex items-center justify-center gap-2">
                        <code className="text-3xl font-bold tracking-widest text-primary font-mono select-all">
                            {receipt.token ?? receipt.status}
                        </code>
                        {receipt.token ? (
                            <Button size="icon" variant="ghost" onClick={handleCopy} className="h-8 w-8 rounded-full">
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        ) : null}
                    </div>
                </div>
                <div className="divide-y p-6 text-sm">
                    {typeof receipt.units === "number" ? (
                        <div className="flex justify-between py-2">
                            <span className="text-muted-foreground">Units</span>
                            <span className="font-medium">{receipt.units} kWh</span>
                        </div>
                    ) : null}
                    <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Status</span>
                        <span className="font-medium">{receipt.status}</span>
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
                    {receipt.transactionReference ? (
                        <div className="flex justify-between py-2">
                            <span className="text-muted-foreground">Gateway Ref</span>
                            <span className="font-mono">{receipt.transactionReference}</span>
                        </div>
                    ) : null}
                    <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">Date</span>
                        <span>{new Date(receipt.date).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
                    <Download className="h-4 w-4" /> Download
                </Button>
                <Button onClick={onDone} className="flex-[2]">
                    Done
                </Button>
            </div>
        </div>
    );
}
