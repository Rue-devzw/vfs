
import { Button } from "@/components/ui/button";
import { Check, Copy, Download } from "lucide-react";
import { TokenResponse } from "../services/smile-pay-service";
import { useState } from "react";
import { formatMoney } from "@/lib/currency";

interface StepReceiptProps {
    receipt: TokenResponse;
    onDone: () => void;
}

export function StepReceipt({ receipt, onDone }: StepReceiptProps) {
    const [copied, setCopied] = useState(false);
    const hasToken = Boolean(receipt.token);
    const hasIssue = receipt.issue === true;
    const hasMultipleTokens = typeof receipt.token === "string" && receipt.token.includes("\n");
    const title = hasIssue ? "Manual Review Required" : "Payment Update";
    const description = receipt.message || (hasIssue
        ? "Your payment was received, but token vending needs manual review."
        : "Transaction processed through WalletPlus.");
    const heroLabel = hasToken ? "Electricity Token" : hasIssue ? "Fulfilment Status" : "Transaction Status";
    const heroValue = hasToken ? receipt.token : hasIssue ? "MANUAL_REVIEW" : receipt.status;

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
            `Amount Paid: ${formatMoney(receipt.amount, receipt.currencyCode ?? "840")}`,
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
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg animate-in zoom-in spin-in-3 ${hasIssue ? "bg-amber-500" : "bg-green-500"}`}>
                    <Check className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
            </div>

            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="bg-muted/30 p-6 text-center">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {heroLabel}
                    </span>
                    <div className="mt-2 flex items-center justify-center gap-2">
                        <code className={`font-bold text-primary font-mono select-all whitespace-pre-wrap break-all ${hasMultipleTokens ? "text-2xl leading-tight tracking-[0.25em]" : "text-3xl tracking-widest"}`}>
                            {heroValue}
                        </code>
                        {hasToken ? (
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
                        <span className="font-medium">{formatMoney(receipt.amount, receipt.currencyCode ?? "840")}</span>
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
