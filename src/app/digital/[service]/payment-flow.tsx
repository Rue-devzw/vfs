"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProcessStatusCard } from "@/components/ui/process-status-card";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Download, Loader2, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DigitalServiceField } from "@/lib/digital-services";
import {
  getDefaultPaymentMethod,
  getEnabledPaymentMethodOptions,
  getPaymentMethodLabel,
  getPaymentMethodMobileHint,
  isPaymentMethod,
  requiresMobileNumber,
  type PaymentMethod,
} from "@/lib/payment-methods";
import { renderGatewayRedirectHtml } from "@/lib/payments/browser";
import { getPaymentProgressContent, resolvePurchaseFlowAction } from "@/lib/payment-flow";
import {
  convertCurrencyAmount,
  convertFromUsd,
  convertToUsd,
  formatMoney,
  getCurrencyMeta,
  type CurrencyCode,
} from "@/lib/currency";
import { useCurrency } from "@/components/currency/currency-provider";
import { calculateDstvBouquetAmountUsd } from "@/lib/dstv-packages";
import {
  extractCimasAccountCurrency,
  extractNyaradzoAccountCurrency,
  getCimasCurrencyRestrictionMessage,
  getNyaradzoCurrencyRestrictionMessage,
  isAllowedCimasPaymentCurrency,
  isAllowedNyaradzoPaymentCurrency,
} from "@/lib/digital-currency-rules";

type DigitalReceipt = {
  reference: string;
  status: string;
  amount?: number;
  currencyCode?: CurrencyCode;
  transactionReference?: string;
  accountReference?: string;
  receiptNumber?: string;
  receiptDetails?: Record<string, unknown>;
  message: string;
};

type DigitalValidationResult = {
  accountName?: string;
  accountNumber?: string;
  billerName?: string;
  amountToBePaid?: string;
  currency?: string;
  raw?: unknown;
};

type AccountCheckState = {
  accountName?: string;
  accountNumber: string;
  billerName?: string;
  accountCurrency?: string;
  accountCurrencyCode?: CurrencyCode;
  dueAmount?: string;
  dueDate?: string;
  monthlyPremium?: string;
  amountToBePaid?: string;
  amountValue?: number;
  numberOfMonths?: string;
};

type BackgroundProcessState = {
  title: string;
  description: string;
  detail?: string;
  progress: number;
};

type CustomerReceiptSlip = {
  title: string;
  subtitle: string;
  receiptNumber?: string;
  status?: string;
  amount?: string;
  rows: Array<[string, string]>;
};

const enabledPaymentMethodOptions = getEnabledPaymentMethodOptions();
const defaultPaymentMethod = getDefaultPaymentMethod();

function asReceiptString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return String(value);
}

function asReceiptRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function formatReceiptMoney(value: unknown, fallbackCurrencyCode: CurrencyCode) {
  const numeric = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return formatMoney(numeric, fallbackCurrencyCode);
}

function receiptCurrencyCode(value: unknown, fallbackCurrencyCode: CurrencyCode): CurrencyCode {
  const normalized = asReceiptString(value)?.toUpperCase();
  if (normalized === "USD") {
    return "840";
  }
  if (normalized === "ZWG" || normalized === "ZIG" || normalized === "ZWL" || normalized === "RTGS") {
    return "924";
  }
  return fallbackCurrencyCode;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function pickString(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  if (typeof value === "string") {
    return value.trim() ? value.trim() : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function parseProviderAmount(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function currencyCodeFromProviderCurrency(value: string | undefined): CurrencyCode | undefined {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "USD" || normalized === "840") return "840";
  if (normalized === "ZIG" || normalized === "ZWG" || normalized === "ZWL" || normalized === "924") return "924";
  return undefined;
}

function getServiceChargeUsd(service: string, serviceMeta: Record<string, string>) {
  if (service === "dstv") {
    return serviceMeta.paymentType?.trim().toUpperCase() === "BOUQUET" ? 3 : 1;
  }
  if (service === "nyaradzo" || service === "cimas") {
    return 1;
  }
  return 0;
}

function buildAccountCheckState(result: DigitalValidationResult, fallbackAccountNumber: string): AccountCheckState {
  const raw = asRecord(result.raw);
  const parsed = asRecord(raw?.parsed);
  const accountCurrency = extractNyaradzoAccountCurrency(result.raw)
    ?? extractCimasAccountCurrency(result.raw)
    ?? pickString(parsed, "currency")
    ?? result.currency;
  const amountText = result.amountToBePaid
    ?? pickString(parsed, "amountToBePaid")
    ?? pickString(parsed, "currentBalance");

  return {
    accountName: result.accountName || pickString(parsed, "policyHolder") || pickString(parsed, "customerName"),
    accountNumber: result.accountNumber || fallbackAccountNumber,
    billerName: result.billerName,
    accountCurrency,
    accountCurrencyCode: currencyCodeFromProviderCurrency(accountCurrency),
    dueAmount: pickString(parsed, "dueAmount"),
    dueDate: pickString(parsed, "dueDate"),
    monthlyPremium: pickString(parsed, "monthlyPremium"),
    amountToBePaid: amountText,
    amountValue: parseProviderAmount(amountText),
    numberOfMonths: pickString(parsed, "numberOfMonths"),
  };
}

function compactDateTime(value: string | undefined) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-ZW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildReceiptHtml(receipt: CustomerReceiptSlip) {
  const rows = receipt.rows
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(receipt.title)} ${receipt.receiptNumber ? escapeHtml(receipt.receiptNumber) : ""}</title>
  <style>
    @page { margin: 16mm; }
    body { margin: 0; background: #f6f8f4; color: #20231f; font-family: Arial, sans-serif; }
    .receipt { max-width: 420px; margin: 24px auto; background: #fff; border: 1px solid #d8e2d4; border-radius: 10px; overflow: hidden; }
    .head { background: #2f7d41; color: #fff; padding: 20px 24px; text-align: center; }
    .brand { font-size: 12px; letter-spacing: .16em; text-transform: uppercase; opacity: .9; }
    h1 { margin: 8px 0 4px; font-size: 24px; }
    .sub { margin: 0; font-size: 13px; opacity: .9; }
    .body { padding: 22px 24px; }
    .status { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px dashed #cfd8cc; padding-bottom: 14px; margin-bottom: 14px; }
    .amount { font-size: 22px; font-weight: 800; color: #2f7d41; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    td { padding: 9px 0; border-bottom: 1px solid #edf1eb; vertical-align: top; }
    td:first-child { color: #687066; }
    td:last-child { text-align: right; font-weight: 700; }
    .foot { padding: 16px 24px 22px; color: #687066; font-size: 12px; line-height: 1.5; }
    @media print { body { background: #fff; } .receipt { margin: 0 auto; } }
  </style>
</head>
<body>
  <main class="receipt">
    <section class="head">
      <div class="brand">Valley Farm Secrets</div>
      <h1>${escapeHtml(receipt.title)}</h1>
      <p class="sub">${escapeHtml(receipt.subtitle)}</p>
    </section>
    <section class="body">
      <div class="status">
        <div>
          <div style="color:#687066;font-size:12px;">Status</div>
          <strong>${escapeHtml(receipt.status || "Successful")}</strong>
        </div>
        ${receipt.amount ? `<div class="amount">${escapeHtml(receipt.amount)}</div>` : ""}
      </div>
      <table>${rows}</table>
    </section>
    <section class="foot">
      This receipt was generated by Valley Farm Secrets for a successful digital payment. Keep it for your records.
    </section>
  </main>
</body>
</html>`;
}

function downloadReceipt(receipt: CustomerReceiptSlip) {
  const blob = new Blob([buildReceiptHtml(receipt)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${receipt.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${receipt.receiptNumber || "receipt"}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function printReceipt(receipt: CustomerReceiptSlip) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=520,height=720");
  if (!printWindow) return;
  printWindow.document.write(buildReceiptHtml(receipt));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function buildNyaradzoReceiptSlip(receipt: DigitalReceipt, fallbackCurrencyCode: CurrencyCode): CustomerReceiptSlip | null {
  const details = receipt.receiptDetails;
  if (!details || details.service !== "Nyaradzo Group") {
    return null;
  }

  const detailCurrencyCode = receiptCurrencyCode(details.currency, fallbackCurrencyCode);
  const billerAmount = typeof details.amount === "number" ? details.amount : parseProviderAmount(asReceiptString(details.amount));
  const grandTotal = typeof receipt.amount === "number" ? receipt.amount : undefined;
  const serviceCharge = billerAmount !== undefined && grandTotal !== undefined && grandTotal >= billerAmount ? grandTotal - billerAmount : undefined;

  const rows: Array<[string, string | undefined]> = [
    ["Receipt Number", receipt.receiptNumber || asReceiptString(details.receiptNumber)],
    ["Policy Number", asReceiptString(details.policyNumber)],
    ["Months Paid", asReceiptString(details.months)],
    ["Customer Name", asReceiptString(details.customerName)],
    ["Payment Date", compactDateTime(asReceiptString(details.paymentDate))],
    ["Biller Amount", formatReceiptMoney(billerAmount, detailCurrencyCode)],
    serviceCharge !== undefined && serviceCharge > 0 ? ["Service Charge", formatReceiptMoney(serviceCharge, detailCurrencyCode)] : ["Service Charge", undefined],
    grandTotal !== undefined ? ["Grand Total", formatMoney(grandTotal, receipt.currencyCode ?? fallbackCurrencyCode)] : ["Grand Total", undefined],
    ["Currency", asReceiptString(details.currency)],
  ];

  return {
    title: "Nyaradzo Receipt",
    subtitle: "Digital premium payment",
    receiptNumber: receipt.receiptNumber || asReceiptString(details.receiptNumber),
    status: asReceiptString(details.status) || receipt.status,
    amount: typeof receipt.amount === "number" ? formatMoney(receipt.amount, receipt.currencyCode ?? fallbackCurrencyCode) : formatReceiptMoney(details.amount, detailCurrencyCode),
    rows: rows.filter((row): row is [string, string] => Boolean(row[1])),
  };
}

function buildDstvReceiptSlip(receipt: DigitalReceipt, fallbackCurrencyCode: CurrencyCode): CustomerReceiptSlip | null {
  const details = receipt.receiptDetails;
  if (!details || details.service !== "DStv Payments") {
    return null;
  }

  const detailCurrencyCode = receiptCurrencyCode(details.currency, fallbackCurrencyCode);
  const paymentType = asReceiptString(details.dstvPaymentType);
  const billerAmount = typeof details.amount === "number" ? details.amount : parseProviderAmount(asReceiptString(details.amount));
  const grandTotal = typeof receipt.amount === "number" ? receipt.amount : undefined;
  const serviceCharge = billerAmount !== undefined && grandTotal !== undefined && grandTotal >= billerAmount ? grandTotal - billerAmount : undefined;

  const rows: Array<[string, string | undefined]> = [
    ["Receipt Number", receipt.receiptNumber || asReceiptString(details.receiptNumber)],
    ["Smartcard Number", asReceiptString(details.customerAccount)],
    ["Customer Name", asReceiptString(details.customerName)],
    ["Payment Type", paymentType === "TOPUP" ? "Top-up" : "Bouquet"],
    ["Package Code", asReceiptString(details.customerPaymentDetails1)],
    ["Months", asReceiptString(details.months)],
    ["Biller Amount", formatReceiptMoney(billerAmount, detailCurrencyCode)],
    serviceCharge !== undefined && serviceCharge > 0 ? ["Service Charge", formatReceiptMoney(serviceCharge, detailCurrencyCode)] : ["Service Charge", undefined],
    grandTotal !== undefined ? ["Grand Total", formatMoney(grandTotal, receipt.currencyCode ?? fallbackCurrencyCode)] : ["Grand Total", undefined],
    ["Payment Date", compactDateTime(asReceiptString(details.paymentDate))],
  ];

  const visibleRows = rows.filter((row): row is [string, string] => {
    if (!row[1]) return false;
    if (row[0] === "Package Code" && paymentType === "TOPUP") return false;
    if (row[0] === "Months" && paymentType === "TOPUP") return false;
    return true;
  });

  return {
    title: "DStv Receipt",
    subtitle: "Digital subscription payment",
    receiptNumber: receipt.receiptNumber || asReceiptString(details.receiptNumber),
    status: asReceiptString(details.status) || receipt.status,
    amount: typeof receipt.amount === "number" ? formatMoney(receipt.amount, receipt.currencyCode ?? fallbackCurrencyCode) : formatReceiptMoney(details.amount, detailCurrencyCode),
    rows: visibleRows,
  };
}

function buildCimasReceiptSlip(receipt: DigitalReceipt, fallbackCurrencyCode: CurrencyCode): CustomerReceiptSlip | null {
  const details = receipt.receiptDetails;
  if (!details || details.service !== "CIMAS") {
    return null;
  }

  const detailCurrencyCode = receiptCurrencyCode(details.currency, fallbackCurrencyCode);
  const referenceType = asReceiptString(details.customerPaymentDetails2);
  const billerAmount = typeof details.amount === "number" ? details.amount : parseProviderAmount(asReceiptString(details.amount));
  const grandTotal = typeof receipt.amount === "number" ? receipt.amount : undefined;
  const serviceCharge = billerAmount !== undefined && grandTotal !== undefined && grandTotal >= billerAmount ? grandTotal - billerAmount : undefined;

  const rows: Array<[string, string | undefined]> = [
    ["Receipt Number", receipt.receiptNumber || asReceiptString(details.receiptNumber)],
    ["Reference Number", asReceiptString(details.customerAccount) || asReceiptString(details.customerPaymentDetails3)],
    ["Reference Type", referenceType === "M" ? "Member" : referenceType === "E" ? "Payer" : referenceType],
    ["Customer Name", asReceiptString(details.customerName)],
    ["Payment Date", compactDateTime(asReceiptString(details.paymentDate))],
    ["Biller Amount", formatReceiptMoney(billerAmount, detailCurrencyCode)],
    serviceCharge !== undefined && serviceCharge > 0 ? ["Service Charge", formatReceiptMoney(serviceCharge, detailCurrencyCode)] : ["Service Charge", undefined],
    grandTotal !== undefined ? ["Grand Total", formatMoney(grandTotal, receipt.currencyCode ?? fallbackCurrencyCode)] : ["Grand Total", undefined],
    ["Effective Date", asReceiptString(details.customerPaymentDetails1)],
    ["Currency", asReceiptString(details.currency)],
  ];

  return {
    title: "CIMAS Receipt",
    subtitle: "Digital medical aid payment",
    receiptNumber: receipt.receiptNumber || asReceiptString(details.receiptNumber),
    status: asReceiptString(details.status) || receipt.status,
    amount: typeof receipt.amount === "number" ? formatMoney(receipt.amount, receipt.currencyCode ?? fallbackCurrencyCode) : formatReceiptMoney(details.amount, detailCurrencyCode),
    rows: rows.filter((row): row is [string, string] => Boolean(row[1])),
  };
}

function buildPaymentConfirmationReceiptSlip(input: {
  service: string;
  serviceLabel: string;
  accountLabel: string;
  accountReference: string;
  receipt: DigitalReceipt;
  fallbackCurrencyCode: CurrencyCode;
}): CustomerReceiptSlip | null {
  if (input.service !== "nyaradzo" && input.service !== "cimas") {
    return null;
  }
  if (!["PAID", "SUCCESS", "DELIVERED"].includes(input.receipt.status)) {
    return null;
  }

  const title = input.service === "nyaradzo" ? "Nyaradzo Receipt" : "CIMAS Receipt";
  const subtitle = input.service === "nyaradzo"
    ? "Digital policy premium payment"
    : "Digital medical aid payment";
  const referenceLabel = input.service === "nyaradzo" ? "Policy Number" : input.accountLabel;
  const rows: Array<[string, string | undefined]> = [
    ["Payment Reference", input.receipt.transactionReference || input.receipt.reference],
    [referenceLabel, input.receipt.accountReference || input.accountReference],
    ["Service", input.serviceLabel],
    ["Amount", typeof input.receipt.amount === "number" ? formatMoney(input.receipt.amount, input.receipt.currencyCode ?? input.fallbackCurrencyCode) : undefined],
  ];

  return {
    title,
    subtitle,
    receiptNumber: input.receipt.receiptNumber || input.receipt.transactionReference || input.receipt.reference,
    status: input.receipt.status,
    amount: typeof input.receipt.amount === "number"
      ? formatMoney(input.receipt.amount, input.receipt.currencyCode ?? input.fallbackCurrencyCode)
      : undefined,
    rows: rows.filter((row): row is [string, string] => Boolean(row[1])),
  };
}

export function GenericDigitalFlow({
  service,
  serviceLabel,
  accountLabel,
  availabilityStatus,
  supportMessage,
  formFields = [],
}: {
  service: string;
  serviceLabel: string;
  accountLabel: string;
  availabilityStatus: "active" | "coming_soon";
  supportMessage?: string;
  formFields?: DigitalServiceField[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currencyCode } = useCurrency();
  const [accountReference, setAccountReference] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [cardPan, setCardPan] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardSecurityCode, setCardSecurityCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod);
  const [loading, setLoading] = useState(false);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [receipt, setReceipt] = useState<DigitalReceipt | null>(null);
  const [serviceMeta, setServiceMeta] = useState<Record<string, string>>({});
  const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod);
  const [processingState, setProcessingState] = useState<BackgroundProcessState | null>(null);
  const [accountCheck, setAccountCheck] = useState<AccountCheckState | null>(null);
  const [accountCheckLoading, setAccountCheckLoading] = useState(false);
  const [receiptPromptReference, setReceiptPromptReference] = useState<string | null>(null);
  const minimumAmount = 0.01;
  const dstvBouquetAmountUsd = service === "dstv" ? calculateDstvBouquetAmountUsd(serviceMeta) : null;
  const amountLockedToPackage = dstvBouquetAmountUsd !== null;
  const requiresAccountVerification = service === "dstv" || service === "nyaradzo" || service === "cimas";
  const amountSetFromAccountCheck = service === "nyaradzo" || service === "cimas";
  const accountCurrencyRestrictionMessage = service === "nyaradzo"
    ? getNyaradzoCurrencyRestrictionMessage(accountCheck?.accountCurrency)
    : service === "cimas"
      ? getCimasCurrencyRestrictionMessage(accountCheck?.accountCurrency)
    : undefined;
  const accountCurrencyAllowed = !amountSetFromAccountCheck
    || (service === "nyaradzo" && accountCheck ? isAllowedNyaradzoPaymentCurrency(accountCheck.accountCurrency, currencyCode) : false)
    || (service === "cimas" && accountCheck ? isAllowedCimasPaymentCurrency(accountCheck.accountCurrency, currencyCode) : false);
  const serviceChargeUsd = getServiceChargeUsd(service, serviceMeta);
  const serviceCharge = convertFromUsd(serviceChargeUsd, currencyCode);
  const providerAmount = Number(amount);
  const paymentTotal = Number.isFinite(providerAmount)
    ? Number((providerAmount + serviceCharge).toFixed(2))
    : serviceCharge;
  const dstvCurrencyAllowed = service !== "dstv" || currencyCode === "840";

  const isAvailable = availabilityStatus === "active";

  const customerReceipt = receipt
    ? buildDstvReceiptSlip(receipt, receipt.currencyCode ?? currencyCode)
      ?? buildNyaradzoReceiptSlip(receipt, receipt.currencyCode ?? currencyCode)
      ?? buildCimasReceiptSlip(receipt, receipt.currencyCode ?? currencyCode)
      ?? buildPaymentConfirmationReceiptSlip({
        service,
        serviceLabel,
        accountLabel,
        accountReference,
        receipt,
        fallbackCurrencyCode: receipt.currencyCode ?? currencyCode,
      })
    : null;
  const shouldPromptToSaveReceipt = Boolean(receipt && customerReceipt && receipt.status !== "FAILED");

  useEffect(() => {
    if (!enabledPaymentMethodOptions.some(option => option.id === paymentMethod)) {
      setPaymentMethod(defaultPaymentMethod);
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (dstvBouquetAmountUsd === null) {
      return;
    }

    setAmount(convertFromUsd(dstvBouquetAmountUsd, currencyCode).toFixed(2));
  }, [currencyCode, dstvBouquetAmountUsd]);

  useEffect(() => {
    if (!amountSetFromAccountCheck || accountCheck?.amountValue === undefined || !accountCheck.accountCurrencyCode) {
      return;
    }

    setAmount(convertCurrencyAmount(accountCheck.amountValue, accountCheck.accountCurrencyCode, currencyCode).toFixed(2));
  }, [accountCheck, amountSetFromAccountCheck, currencyCode]);

  useEffect(() => {
    if (!receipt || !customerReceipt || receipt.status === "FAILED" || receiptPromptReference === receipt.reference) {
      return;
    }

    toast({
      title: "Save your receipt",
      description: "Download or print this receipt before leaving the page.",
      action: (
        <ToastAction altText="Save receipt" onClick={() => downloadReceipt(customerReceipt)}>
          Save receipt
        </ToastAction>
      ),
    });
    setReceiptPromptReference(receipt.reference);
  }, [customerReceipt, receipt, receiptPromptReference, toast]);

  const checkStatus = useCallback(async (reference: string) => {
    let latestStatus = "PENDING";
    let latestAmount: number | undefined;
    let latestCurrencyCode: CurrencyCode | undefined;
    let latestGatewayReference: string | undefined;
    let latestAccountReference = accountReference;
    let latestReceiptNumber: string | undefined;
    let latestReceiptDetails: Record<string, unknown> | undefined;
    let fulfilmentIssue = false;
    let statusMessage: string | undefined;

    setProcessingState({
      title: "Checking payment status",
      description: `We are waiting for the latest ${serviceLabel} payment update.`,
      detail: "Keep this page open while we confirm the payment result and save your request.",
      progress: 68,
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await fetch(`/api/payments/status/${encodeURIComponent(reference)}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to check payment status");
      }

      latestStatus = String(data.data?.status || "PENDING").toUpperCase();
      latestAmount = typeof data.data?.amount === "number" ? data.data.amount : latestAmount;
      latestCurrencyCode = data.data?.currencyCode === "924" ? "924" : data.data?.currencyCode === "840" ? "840" : latestCurrencyCode;
      latestGatewayReference = typeof data.data?.transactionReference === "string"
        ? data.data.transactionReference
        : latestGatewayReference;
      const rawReceiptData = data.data?.receiptData ?? data.data?.vendedData;
      if (rawReceiptData && typeof rawReceiptData === "object") {
        const candidate = rawReceiptData as {
          issue?: unknown;
          message?: unknown;
          receiptNumber?: unknown;
          receiptDetails?: unknown;
        };
        fulfilmentIssue = candidate.issue === true;
        statusMessage = typeof candidate.message === "string" ? candidate.message : statusMessage;
        latestReceiptNumber = typeof candidate.receiptNumber === "string" ? candidate.receiptNumber : latestReceiptNumber;
        latestReceiptDetails = asReceiptRecord(candidate.receiptDetails) ?? latestReceiptDetails;
      }
      if (typeof data.data?.accountReference === "string") {
        latestAccountReference = data.data.accountReference;
        setAccountReference((current) => current || data.data.accountReference);
      }

      const engagement = getPaymentProgressContent(latestStatus, {
        paymentMethod: activePaymentMethod,
        subject: `${serviceLabel} payment`,
      });
      const progress = ["PAID", "SUCCESS"].includes(latestStatus)
        ? 92
        : latestStatus === "PROCESSING"
          ? 82
          : 72;
      setProcessingState({
        title: engagement.title,
        description: engagement.description,
        detail: fulfilmentIssue
          ? "Payment is confirmed, but fulfilment could not be completed. The request was marked failed for support review."
          : ["PAID", "SUCCESS"].includes(latestStatus)
          ? "Payment is confirmed. We are recording the request so you can track it from your account."
          : "Your request is active in the background. Approval can happen on your device or through the secure payment page.",
        progress,
      });

      const requiresReceiptConfirmation = service === "dstv" || service === "nyaradzo" || service === "cimas";
      const hasReceiptConfirmation = Boolean(latestReceiptDetails || latestReceiptNumber);

      if (fulfilmentIssue) {
        break;
      }

      if (["PAID", "SUCCESS", "FAILED", "CANCELED", "CANCELLED", "EXPIRED"].includes(latestStatus)) {
        if (requiresReceiptConfirmation && ["PAID", "SUCCESS"].includes(latestStatus) && !hasReceiptConfirmation && attempt < 9) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const engagement = getPaymentProgressContent(latestStatus, {
      paymentMethod: activePaymentMethod,
      subject: `${serviceLabel} payment`,
    });
    setProcessingState(null);

    setReceipt({
      reference,
      status: fulfilmentIssue ? "FAILED" : latestStatus,
      amount: latestAmount,
      currencyCode: latestCurrencyCode ?? currencyCode,
      transactionReference: latestGatewayReference,
      accountReference: latestAccountReference,
      receiptNumber: latestReceiptNumber,
      receiptDetails: latestReceiptDetails,
      message: statusMessage || engagement.description,
    });
  }, [accountReference, activePaymentMethod, currencyCode, service, serviceLabel]);

  useEffect(() => {
    const reference = searchParams.get("reference");
    const status = searchParams.get("status");
    if (!reference) return;

    let ignore = false;
    setLoading(true);

    const syncFromReturn = async () => {
      try {
        await checkStatus(reference);
        if (status && ["FAILED", "CANCELED", "CANCELLED"].includes(status.toUpperCase())) {
          toast({
            title: "Payment Update",
            description: `Gateway returned ${status}. The latest status has been refreshed.`,
          });
        }
      } catch (error) {
        if (!ignore) {
          toast({
            title: "Status Check Failed",
            description: error instanceof Error ? error.message : "Unable to refresh payment status.",
            variant: "destructive",
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          router.replace(`/digital/${service}`);
        }
      }
    };

    syncFromReturn();

    return () => {
      ignore = true;
    };
  }, [checkStatus, router, searchParams, service, toast]);

  const validateCustomerDetails = async (options?: { inline?: boolean; serviceMetaOverride?: Record<string, string> }) => {
    if (!options?.inline) {
      setProcessingState({
        title: "Validating customer details",
        description: `We are checking your ${serviceLabel} account details before payment.`,
        detail: "Payment will only start after the provider confirms the account details.",
        progress: 24,
      });
    }

    const res = await fetch("/api/digital/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: service.toUpperCase(),
        accountNumber: accountReference,
        serviceMeta: options?.serviceMetaOverride ?? serviceMeta,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Unable to validate customer details.");
    }

    const validationResult = data.data as DigitalValidationResult;
    const validatedAccountNumber = validationResult.accountNumber || accountReference;

    setAccountReference(validatedAccountNumber);
    setServiceMeta((current) => ({
      ...current,
      accountName: validationResult.accountName ?? current.accountName ?? "",
      billerName: validationResult.billerName ?? current.billerName ?? serviceLabel,
      validatedAccountNumber,
    }));

    return {
      ...validationResult,
      accountNumber: validatedAccountNumber,
    };
  };

  const handleAccountCheck = async () => {
    setAccountCheckLoading(true);
    try {
      if (!accountReference.trim()) {
        throw new Error(`${accountLabel} is required.`);
      }

      const validationResult = await validateCustomerDetails({
        inline: true,
        serviceMetaOverride: {
          ...serviceMeta,
          months: serviceMeta.months?.trim() || "1",
        },
      });
      const nextAccountCheck = buildAccountCheckState(validationResult, accountReference);
      setAccountCheck(nextAccountCheck);
      if (service === "nyaradzo" && nextAccountCheck.numberOfMonths) {
        setServiceMeta((current) => ({
          ...current,
          months: nextAccountCheck.numberOfMonths || "",
        }));
      }
      toast({
        title: "Account found",
        description: nextAccountCheck.accountName
          ? `${nextAccountCheck.accountName} was validated successfully.`
          : "The account details were validated successfully.",
      });
    } catch (error) {
      setAccountCheck(null);
      toast({
        title: "Account check failed",
        description: error instanceof Error ? error.message : "Unable to validate account details.",
        variant: "destructive",
      });
    } finally {
      setAccountCheckLoading(false);
    }
  };

  const initiate = async () => {
    setLoading(true);
    try {
      if (!isAvailable) {
        throw new Error(supportMessage || `${serviceLabel} is not available yet.`);
      }
      if (requiresAccountVerification && !accountCheck) {
        throw new Error(`Check the ${accountLabel.toLowerCase()} before proceeding to payment.`);
      }
      if (!accountCurrencyAllowed) {
        throw new Error(accountCurrencyRestrictionMessage || "This account does not accept the selected payment currency.");
      }
      const validationResult = await validateCustomerDetails();
      const validatedAccountNumber = validationResult.accountNumber || accountReference;
      const validatedAccountCheck = buildAccountCheckState(validationResult, validatedAccountNumber);
      if (requiresAccountVerification) {
        const validatedCurrencyAllowed = service === "nyaradzo"
          ? isAllowedNyaradzoPaymentCurrency(validatedAccountCheck.accountCurrency, currencyCode)
          : service === "cimas"
            ? isAllowedCimasPaymentCurrency(validatedAccountCheck.accountCurrency, currencyCode)
            : true;
        const validatedCurrencyMessage = service === "nyaradzo"
          ? getNyaradzoCurrencyRestrictionMessage(validatedAccountCheck.accountCurrency)
          : service === "cimas"
            ? getCimasCurrencyRestrictionMessage(validatedAccountCheck.accountCurrency)
            : undefined;
        if (!validatedCurrencyAllowed) {
          throw new Error(validatedCurrencyMessage || "This account does not accept the selected payment currency.");
        }
        setAccountCheck(validatedAccountCheck);
      }
      const validatedServiceMeta = {
        ...serviceMeta,
        accountName: validationResult.accountName ?? validatedAccountCheck.accountName ?? serviceMeta.accountName ?? "",
        billerName: validationResult.billerName ?? serviceMeta.billerName ?? serviceLabel,
        validatedAccountNumber,
        ...(validatedAccountCheck.accountCurrency ? { accountCurrency: validatedAccountCheck.accountCurrency } : {}),
        ...(service === "nyaradzo" && validatedAccountCheck.numberOfMonths
          ? { months: validatedAccountCheck.numberOfMonths }
          : {}),
      };
      setProcessingState({
        title: "Preparing payment request",
        description: `We are creating your ${serviceLabel} payment request now.`,
        detail: "The account details were confirmed. We are opening the secure payment session next.",
        progress: 38,
      });
      const res = await fetch("/api/digital/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: service.toUpperCase(),
          accountNumber: validatedAccountNumber,
          amount: convertToUsd(Number(amount), currencyCode),
          currencyCode,
          paymentMethod,
          customerMobile: paymentMethod === "CARD" ? undefined : (customerMobile || undefined),
          cardDetails: paymentMethod === "CARD" ? {
            pan: cardPan.replace(/\s/g, ""),
            expMonth: cardExpMonth,
            expYear: cardExpYear,
            securityCode: cardSecurityCode,
          } : undefined,
          serviceMeta: validatedServiceMeta,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to initiate payment");

      setActivePaymentMethod(paymentMethod);
      const action = resolvePurchaseFlowAction(data);
      const engagement = getPaymentProgressContent(data.status, {
        paymentMethod,
        subject: `${serviceLabel} payment`,
      });

      if (action.type === "otp") {
        setTransactionReference(data.transactionReference);
        setOrderReference(data.reference);
        setAwaitingOtp(true);
        setProcessingState(null);
        toast({
          title: engagement.title,
          description: data.message || engagement.description,
        });
        return;
      }

      if (action.type === "redirect") {
        setProcessingState({
          title: "Redirecting to secure checkout",
          description: "We are sending you to the payment gateway now.",
          detail: "After payment, you will return here automatically so we can continue tracking the result.",
          progress: 55,
        });
        window.location.href = action.url;
        return;
      }

      if (action.type === "html") {
        setProcessingState({
          title: "Opening bank verification",
          description: "We are handing you off to your bank's secure 3D Secure challenge.",
          detail: "Complete the challenge and you will be returned here automatically.",
          progress: 62,
        });
        renderGatewayRedirectHtml(action.html);
        return;
      }

      setOrderReference(data.reference);
      toast({
        title: engagement.title,
        description: data.message || engagement.description,
      });
      await checkStatus(data.reference);
    } catch (error) {
      setProcessingState(null);
      toast({
        title: "Initiation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmOtp = async () => {
    setLoading(true);
    try {
      setProcessingState({
        title: "Confirming your OTP",
        description: "We are submitting the verification code to the payment gateway.",
        detail: "Please wait while we confirm the payment result in the background.",
        progress: 74,
      });
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: orderReference,
          transactionReference,
          otp,
          paymentMethod,
          customerMobile,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "OTP confirmation failed");

      toast({
        title: "OTP Confirmed",
        description: data.message || "Payment processed. Checking fulfillment status...",
      });
      setAwaitingOtp(false);
      await checkStatus(orderReference);
    } catch (error) {
      setProcessingState(null);
      toast({
        title: "Confirmation failed",
        description: error instanceof Error ? error.message : "Confirmation failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (receipt) {
    const showPlainSummary = !customerReceipt;

    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
      <Card className="mx-auto w-full max-w-md space-y-6 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="text-center space-y-3">
          <div className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
            receipt.status === "FAILED" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}>
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-semibold">Payment Update</h2>
          <p className="text-sm text-muted-foreground">{receipt.message}</p>
        </div>

        {shouldPromptToSaveReceipt ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Save your receipt before leaving this page</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Keep a copy for your records. You can download it now or print it straight away.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="gap-2" onClick={() => printReceipt(customerReceipt!)}>
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button type="button" className="gap-2" onClick={() => downloadReceipt(customerReceipt!)}>
                  <Download className="h-4 w-4" /> Save receipt
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {customerReceipt ? (
          <div className="overflow-hidden rounded-lg border bg-background text-sm shadow-sm">
            <div className="bg-primary px-5 py-4 text-center text-primary-foreground">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-90">Valley Farm Secrets</div>
              <div className="mt-1 text-xl font-bold">{customerReceipt.title}</div>
              <div className="text-xs opacity-90">{customerReceipt.subtitle}</div>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4 border-b border-dashed pb-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
                  <div className="font-semibold">{customerReceipt.status || receipt.status}</div>
                </div>
                {customerReceipt.amount ? (
                  <div className="text-right text-xl font-bold text-primary">{customerReceipt.amount}</div>
                ) : null}
              </div>
              <div>
                {customerReceipt.rows.map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 py-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="max-w-[60%] break-words text-right font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-dashed pt-4 text-xs leading-5 text-muted-foreground">
                This receipt was generated by Valley Farm Secrets for your successful digital payment.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t bg-muted/30 p-3">
              <Button type="button" variant="outline" className="gap-2" onClick={() => printReceipt(customerReceipt)}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={() => downloadReceipt(customerReceipt)}>
                <Download className="h-4 w-4" /> Download
              </Button>
            </div>
          </div>
        ) : null}

        {showPlainSummary ? (
          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium">{serviceLabel}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Status</span>
              <span className="font-semibold">{receipt.status}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">{accountLabel}</span>
              <span className="font-medium">{accountReference || "Submitted in request"}</span>
            </div>
            {typeof receipt.amount === "number" ? (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{formatMoney(receipt.amount, receipt.currencyCode ?? currencyCode)}</span>
              </div>
            ) : null}
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs">{receipt.reference}</span>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {getPaymentProgressContent(receipt.status, {
            paymentMethod: activePaymentMethod,
            subject: `${serviceLabel} request`,
          }).description} You can track progress from your account once signed in.
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setReceipt(null);
              setAccountReference("");
              setAmount("");
              setServiceMeta({});
              setAccountCheck(null);
            }}
          >
            New Request
          </Button>
          <Button className="flex-[2]" onClick={() => router.push("/account")}>
            Open My Account
          </Button>
        </div>
      </Card>
      </motion.div>
    );
  }

  if (processingState) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
      <Card className="mx-auto w-full max-w-md rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <ProcessStatusCard
          title={processingState.title}
          description={processingState.description}
          detail={processingState.detail}
          progress={processingState.progress}
        />
      </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: "easeOut" }}
    >
    <Card className="mx-auto w-full max-w-md space-y-6 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="space-y-4">
        {!isAvailable && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {supportMessage || `${serviceLabel} is not available yet.`}
          </div>
        )}
        {isAvailable && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            {awaitingOtp 
              ? "Please enter the OTP sent to your phone to complete the transaction." 
              : `Pay with ${getPaymentMethodLabel(paymentMethod)}. After payment, fulfilment runs automatically and the result is saved to your account.`}
          </div>
        )}
        {service === "dstv" && !dstvCurrencyAllowed ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            DStv payments are available in USD only. Use the currency switcher to select USD before continuing.
          </div>
        ) : null}
        <div className="space-y-4">
          {awaitingOtp ? (
            <div className="space-y-4 rounded-lg border bg-background p-4">
              <div className="space-y-2 text-center">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Security Check</Label>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-2">
                  <Loader2 className="h-6 w-6 animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground">Verification code sent to {customerMobile}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Enter 6-digit OTP</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  className="h-14 bg-background text-center font-mono text-2xl tracking-[0.5em]"
                  maxLength={6}
                />
              </div>
              <Button 
                onClick={confirmOtp} 
                disabled={loading || otp.length < 4}
                className="h-12 w-full shadow-sm"
              >
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Verifying...</> : "Confirm Payment"}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setAwaitingOtp(false)} 
                disabled={loading}
                className="w-full text-xs text-muted-foreground"
              >
                Cancel and try again
              </Button>
            </div>
          ) : (
            <>
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{serviceLabel} Details</Label>
              <div className="grid gap-4 rounded-lg border bg-background p-4">
                <div className="space-y-2">
                  <Label htmlFor="account">{accountLabel}</Label>
                  <div className={cn("grid gap-2", requiresAccountVerification ? "sm:grid-cols-[1fr_auto]" : "")}>
                    <Input
                      id="account"
                      value={accountReference}
                      onChange={(e) => {
                        setAccountReference(e.target.value);
                        if (requiresAccountVerification) {
                          setAccountCheck(null);
                        }
                      }}
                      placeholder="Enter your account reference"
                      className="bg-background"
                    />
                    {requiresAccountVerification ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAccountCheck}
                        disabled={accountCheckLoading || loading || !accountReference.trim()}
                        className="whitespace-nowrap"
                      >
                        {accountCheckLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking</> : "Check account"}
                      </Button>
                    ) : null}
                  </div>
                  {requiresAccountVerification && accountCheck ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                      <div className="grid gap-2">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">{service === "nyaradzo" ? "Policy holder" : "Customer name"}</span>
                          <span className="text-right font-medium">{accountCheck.accountName || "Validated account"}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">{accountLabel}</span>
                          <span className="text-right font-mono text-xs">{accountCheck.accountNumber}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Account currency</span>
                          <span className="text-right font-medium">{accountCheck.accountCurrency || "Not specified"}</span>
                        </div>
                        {accountCheck.dueAmount ? (
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Current due amount</span>
                            <span className="text-right font-medium">{accountCheck.dueAmount}</span>
                          </div>
                        ) : null}
                        {accountCheck.dueDate ? (
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Due date</span>
                            <span className="text-right font-medium">{accountCheck.dueDate}</span>
                          </div>
                        ) : null}
                        {accountCheck.monthlyPremium ? (
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Monthly premium</span>
                            <span className="text-right font-medium">{accountCheck.monthlyPremium}</span>
                          </div>
                        ) : null}
                        {service === "nyaradzo" && accountCheck.numberOfMonths ? (
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Months to be paid</span>
                            <span className="text-right font-medium">{accountCheck.numberOfMonths}</span>
                          </div>
                        ) : null}
                        {accountCheck.amountToBePaid ? (
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Amount to be paid</span>
                            <span className="text-right font-medium">{accountCheck.amountToBePaid}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {amountSetFromAccountCheck && accountCheck && accountCurrencyRestrictionMessage ? (
                    <p className={cn(
                      "text-xs",
                      accountCurrencyAllowed ? "text-muted-foreground" : "text-destructive",
                    )}>
                      {accountCurrencyRestrictionMessage}
                    </p>
                  ) : null}
                </div>
                {formFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>{field.label}</Label>
                    {field.options?.length ? (
                      <Select
                        value={serviceMeta[field.id] ?? ""}
                        onValueChange={(value) => {
                          setServiceMeta((current) => ({ ...current, [field.id]: value }));
                          if (amountSetFromAccountCheck) {
                            setAccountCheck(null);
                            setAmount("");
                          }
                        }}
                      >
                        <SelectTrigger id={field.id} className="bg-background">
                          <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={field.id}
                        type={field.type === "number" ? "number" : "text"}
                        min={field.type === "number" ? "1" : undefined}
                        value={serviceMeta[field.id] ?? ""}
                        onChange={(e) => {
                          setServiceMeta((current) => ({ ...current, [field.id]: e.target.value }));
                          if (amountSetFromAccountCheck) {
                            setAccountCheck(null);
                            setAmount("");
                          }
                        }}
                        placeholder={field.placeholder}
                        className="bg-background"
                      />
                    )}
                    {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
                  </div>
                ))}
                <div className="space-y-2">
                    <Label htmlFor="amount">
                      {amountSetFromAccountCheck ? "Amount to be paid" : "Amount"} ({getCurrencyMeta(currencyCode).label})
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 min-w-10 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                        {getCurrencyMeta(currencyCode).symbol.trim()}
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        min={String(minimumAmount)}
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-16"
                        readOnly={amountLockedToPackage || amountSetFromAccountCheck}
                      />
                    </div>
                    {amountSetFromAccountCheck ? (
                      <p className="text-xs text-muted-foreground">
                        Amount is set from the validated account response and must be paid in full.
                      </p>
                    ) : null}
                    {amountLockedToPackage ? (
                      <p className="text-xs text-muted-foreground">
                        Amount is calculated from the selected DSTV package, add-on, and months.
                      </p>
                    ) : null}
                    {serviceChargeUsd > 0 && amount ? (
                      <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                        <div className="flex justify-between gap-4 py-1">
                          <span className="text-muted-foreground">Provider amount</span>
                          <span className="font-medium">{formatMoney(providerAmount, currencyCode)}</span>
                        </div>
                        <div className="flex justify-between gap-4 py-1">
                          <span className="text-muted-foreground">Service charge</span>
                          <span className="font-medium">{formatMoney(serviceCharge, currencyCode)}</span>
                        </div>
                        <div className="mt-1 flex justify-between gap-4 border-t pt-2">
                          <span className="font-semibold">Payment total</span>
                          <span className="font-semibold">{formatMoney(paymentTotal, currencyCode)}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</Label>
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
                        "flex h-12 cursor-pointer items-center justify-center rounded-lg border text-xs font-semibold transition-all",
                        paymentMethod === m.id ? "border-primary bg-primary/5 text-primary" : "border-border bg-background hover:border-muted-foreground/30",
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
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">{getPaymentMethodMobileHint(paymentMethod)}</p>
                </div>
              )}

              {paymentMethod === "CARD" && (
                <div className="grid animate-in gap-4 rounded-lg border bg-background p-4 fade-in slide-in-from-top-2">
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
                  <div className="grid grid-cols-3 gap-4">
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
                  <p className="text-[10px] text-muted-foreground">
                    If your bank requires 3D Secure, the challenge will open automatically and return you here once complete.
                  </p>
                </div>
              )}

              <Button
                disabled={
                  loading
                  || !isAvailable
                  || !accountReference
                  || !amount
                  || !dstvCurrencyAllowed
                  || (requiresAccountVerification && !accountCheck)
                  || !accountCurrencyAllowed
                  || (requiresMobileNumber(paymentMethod) && !customerMobile)
                  || (paymentMethod === "CARD" && (!cardPan || !cardExpMonth || !cardExpYear || !cardSecurityCode))
                  || formFields.some(field => field.required && !(serviceMeta[field.id] ?? "").trim())
                }
                onClick={initiate}
                className="h-12 w-full shadow-sm"
              >
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Redirecting...</> : "Proceed to Payment"}
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
    </motion.div>
  );
}
