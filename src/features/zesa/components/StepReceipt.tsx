
import { Button } from "@/components/ui/button";
import { Check, Copy, Download } from "lucide-react";
import { TokenResponse } from "../services/smile-pay-service";
import { useState } from "react";
import { formatMoney } from "@/lib/currency";
import { formatTokenGroups } from "@/lib/token-format";
import { downloadZesaReceiptPdf } from "../lib/receipt-pdf";

interface StepReceiptProps {
    receipt: TokenResponse;
    onDone: () => void;
}

export function StepReceipt({ receipt, onDone }: StepReceiptProps) {
    const [copied, setCopied] = useState(false);
    const hasToken = Boolean(receipt.token);
    const hasIssue = receipt.issue === true;
    const title = hasIssue ? "Manual Review Required" : "Payment Update";
    const description = receipt.message || (hasIssue
        ? "Your payment was received, but token vending needs manual review."
        : "Transaction processed through WalletPlus.");
    const normalizedTokens = typeof receipt.token === "string"
        ? formatTokenGroups(receipt.token)
            .split("\n")
            .map((token) => token.trim())
            .filter(Boolean)
        : [];
    const tariffRate = typeof receipt.units === "number" && receipt.units > 0
        ? receipt.amount / receipt.units
        : null;

    const handleCopy = () => {
        if (!receipt.token) return;
        navigator.clipboard.writeText(formatTokenGroups(receipt.token));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = async () => {
        await downloadZesaReceiptPdf({
            ...receipt,
            token: receipt.token ? formatTokenGroups(receipt.token) : receipt.token,
        });
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

            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                <div className="space-y-5 p-6 text-[15px] leading-tight text-foreground">
                    <div className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                            <span className="text-muted-foreground">Receipt no:</span>
                            <span className="text-right font-medium uppercase">{receipt.receiptNumber}</span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <span className="text-muted-foreground">Meter no:</span>
                            <span className="font-medium">{receipt.meterNumber}</span>
                        </div>
                        <div className="text-muted-foreground">Electricity Pre-paid</div>
                        {receipt.customerName ? (
                            <div className="space-y-1">
                                <div className="text-muted-foreground">Customer Name:</div>
                                <div className="font-medium uppercase leading-snug">{receipt.customerName}</div>
                            </div>
                        ) : null}
                    </div>

                    <div className="border-y border-dotted border-border/80 py-3 text-center">
                        <div className="text-[1.65rem] font-extrabold uppercase tracking-[0.06em] text-primary">
                            Electricity Token
                        </div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                            Enter this code into your meter:
                        </div>
                        {hasToken ? (
                            <div className="mt-3 flex items-start justify-center gap-2">
                                <div className="space-y-1.5">
                                    {normalizedTokens.map((token) => (
                                        <div
                                            key={token}
                                            className="font-mono text-[1.65rem] font-bold leading-none tracking-[0.08em] text-foreground"
                                        >
                                            {token}
                                        </div>
                                    ))}
                                </div>
                                <Button size="icon" variant="ghost" onClick={handleCopy} className="mt-1 h-8 w-8 rounded-full">
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        ) : (
                            <div className="mt-3 text-sm font-medium uppercase tracking-[0.18em] text-amber-600">
                                {hasIssue ? "Manual Review" : receipt.status}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 text-base">
                        {tariffRate !== null && typeof receipt.units === "number" ? (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-muted-foreground">
                                    Tariff: {receipt.units.toFixed(2)} kWh @ {tariffRate.toFixed(2)} /kWh:
                                </span>
                                <span className="font-medium">{formatMoney(receipt.amount, receipt.currencyCode ?? "840")}</span>
                            </div>
                        ) : null}
                        {typeof receipt.units === "number" ? (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-muted-foreground">Energy Bought (kWh):</span>
                                <span className="font-medium">{receipt.units.toFixed(2)}</span>
                            </div>
                        ) : null}
                        <div className="flex items-start justify-between gap-4">
                            <span className="text-muted-foreground">Tender Amount</span>
                            <span className="font-medium">{formatMoney(receipt.amount, receipt.currencyCode ?? "840")}</span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <span className="text-muted-foreground">Status</span>
                            <span className="font-medium">{receipt.status}</span>
                        </div>
                        {receipt.transactionReference ? (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-muted-foreground">Gateway Ref</span>
                                <span className="font-mono text-sm">{receipt.transactionReference}</span>
                            </div>
                        ) : null}
                        <div className="flex items-start justify-between gap-4">
                            <span className="text-muted-foreground">Date</span>
                            <span className="font-medium">{new Date(receipt.date).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
                    <Download className="h-4 w-4" /> Download PDF
                </Button>
                <Button onClick={onDone} className="flex-[2]">
                    Done
                </Button>
            </div>
        </div>
    );
}
