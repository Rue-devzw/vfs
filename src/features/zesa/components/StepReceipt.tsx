
import { Button } from "@/components/ui/button";
import { Check, Copy, Download } from "lucide-react";
import { TokenResponse } from "../services/smile-pay-service";
import { useState } from "react";
import { formatTokenGroups } from "@/lib/token-format";
import { downloadZesaReceiptPdf } from "../lib/receipt-pdf";
import { formatZetdcMajorMoney, formatZetdcReceiptMoney, getZetdcTariffRate } from "../lib/receipt-money";

interface StepReceiptProps {
    receipt: TokenResponse;
    onDone: () => void;
}

export function StepReceipt({ receipt, onDone }: StepReceiptProps) {
    const [copied, setCopied] = useState(false);
    const hasToken = Boolean(receipt.token);
    const hasIssue = receipt.issue === true;
    const title = hasIssue ? "Fulfilment Failed" : "Payment Update";
    const description = receipt.message || (hasIssue
        ? "Your payment was received, but token vending failed."
        : "Transaction processed through WalletPlus.");
    const normalizedTokens = typeof receipt.token === "string"
        ? formatTokenGroups(receipt.token)
            .split("\n")
            .map((token) => token.trim())
            .filter(Boolean)
        : [];
    const tariffReceiptAmount = receipt.energyCharge ?? receipt.tenderAmount;
    const tariffRate = getZetdcTariffRate({
        units: receipt.units,
        receiptAmountMinor: tariffReceiptAmount,
        fallbackAmountMajor: receipt.amount,
    });
    const issuedAt = receipt.receiptDate
        ? [receipt.receiptDate, receipt.receiptTime].filter(Boolean).join(" ")
        : new Date(receipt.date).toLocaleDateString();
    const receiptCurrencyCode = receipt.receiptCurrencyCode ?? receipt.currencyCode ?? "840";
    const paymentCurrencyCode = receipt.currencyCode ?? "840";

    const formatReceiptMoney = (amount: number) => formatZetdcReceiptMoney(amount, receiptCurrencyCode);
    const formatPaymentMoney = (amount: number) => formatZetdcMajorMoney(amount, paymentCurrencyCode);

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

            <div className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
                <div className="border-b border-dotted border-border/80 px-6 py-5 text-center">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tax Invoice</div>
                    <div className="mt-2 text-sm font-bold uppercase leading-tight text-foreground">
                        Zimbabwe Electricity Transmission<br />and Distribution Company
                    </div>
                    <div className="mt-1 text-xs uppercase leading-snug text-muted-foreground">
                        Electricity Pre-paid
                    </div>
                </div>

                <div className="space-y-5 p-6 text-[15px] leading-tight text-foreground">
                    <div className="space-y-2 font-sans">
                        <div className="flex items-start justify-between gap-4">
                            <span className="text-muted-foreground">Receipt no:</span>
                            <span className="text-right font-medium uppercase">{receipt.receiptNumber}</span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <span className="text-muted-foreground">Meter no:</span>
                            <span className="font-medium">{receipt.meterNumber}</span>
                        </div>
                        {receipt.customerName ? (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-muted-foreground">Customer Name:</span>
                                <span className="text-right font-medium uppercase leading-snug">{receipt.customerName}</span>
                            </div>
                        ) : null}
                        {receipt.customerAddress ? (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-muted-foreground">Address:</span>
                                <span className="max-w-[15rem] text-right font-medium uppercase leading-snug">{receipt.customerAddress}</span>
                            </div>
                        ) : null}
                    </div>

                    <div className="border-y border-dotted border-border/80 py-3 text-center">
                        <div className="text-xl font-extrabold uppercase tracking-[0.08em] text-primary">
                            Electricity Token
                        </div>
                        <div className="mt-1 text-base font-semibold text-foreground">
                            Enter this code into your meter:
                        </div>
                        {hasToken ? (
                            <div className="mt-3 flex items-start justify-center gap-2">
                                <div className="min-w-0 space-y-1.5">
                                    {normalizedTokens.map((token) => (
                                        <div
                                            key={token}
                                            className="break-words font-mono text-xl font-bold leading-tight tracking-[0.06em] text-foreground sm:text-2xl"
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
                                {hasIssue ? "FAILED" : receipt.status}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 text-base">
                        {tariffRate !== null && typeof receipt.units === "number" ? (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-muted-foreground">
                                    Tariff{receipt.tariffName ? ` (${receipt.tariffName})` : ""}: {receipt.units.toFixed(2)} kWh @ {tariffRate.toFixed(2)} /kWh:
                                </span>
                                <span className="font-medium">
                                    {typeof tariffReceiptAmount === "number"
                                        ? formatReceiptMoney(tariffReceiptAmount)
                                        : formatPaymentMoney(receipt.amount)}
                                </span>
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
                            <span className="font-medium">
                                {typeof receipt.tenderAmount === "number"
                                    ? formatReceiptMoney(receipt.tenderAmount)
                                    : formatPaymentMoney(receipt.amount)}
                            </span>
                        </div>
                        {typeof receipt.energyCharge === "number" ? (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-muted-foreground">Energy Charge</span>
                                <span className="font-medium">{formatReceiptMoney(receipt.energyCharge)}</span>
                            </div>
                        ) : null}
                        {typeof receipt.debtCollected === "number" ? (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-muted-foreground">Debt Collected</span>
                                <span className="font-medium">{formatReceiptMoney(receipt.debtCollected)}</span>
                            </div>
                        ) : null}
                        {typeof receipt.levyAmount === "number" ? (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-muted-foreground">RE Levy{typeof receipt.levyPercent === "number" ? ` (${receipt.levyPercent}%)` : ""}</span>
                                <span className="font-medium">{formatReceiptMoney(receipt.levyAmount)}</span>
                            </div>
                        ) : null}
                        {typeof receipt.vatAmount === "number" ? (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-muted-foreground">VAT{typeof receipt.vatPercent === "number" ? ` (${receipt.vatPercent}%)` : ""}</span>
                                <span className="font-medium">{formatReceiptMoney(receipt.vatAmount)}</span>
                            </div>
                        ) : null}
                        {typeof receipt.totalPaid === "number" ? (
                            <div className="flex items-start justify-between gap-4 border-t border-dotted border-border/80 pt-2">
                                <span className="text-muted-foreground">Total Paid</span>
                                <span className="font-semibold">{formatReceiptMoney(receipt.totalPaid)}</span>
                            </div>
                        ) : null}
                        {typeof receipt.totalTendered === "number" && receipt.totalTendered !== receipt.totalPaid ? (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-muted-foreground">Total Tendered</span>
                                <span className="font-medium">{formatReceiptMoney(receipt.totalTendered)}</span>
                            </div>
                        ) : null}
                        {receiptCurrencyCode !== paymentCurrencyCode ? (
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-muted-foreground">Payment Amount</span>
                                <span className="font-medium">{formatPaymentMoney(receipt.amount)}</span>
                            </div>
                        ) : null}
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
                            <span className="font-medium">{issuedAt}</span>
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
