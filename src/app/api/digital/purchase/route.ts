import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingOrder, setOrderStatus } from "@/server/orders";
import { DigitalService, DigitalServiceUnavailableError } from "@/lib/digital-service-logic";
import { getDigitalServiceConfig } from "@/lib/digital-services";
import { upsertDigitalOrder } from "@/lib/firestore/digital-orders";
import {
    EgressGatewayError,
    isEgressServiceUnavailable,
} from "@/lib/payments/egress";
import { SmilePayGatewayError } from "@/lib/payments/smile-pay";
import { PAYMENT_METHOD_VALUES } from "@/lib/payment-methods";
import type { CardPaymentDetails } from "@/lib/payments/types";
import { verifyCustomerSession } from "@/lib/auth";
import {
    extractCimasAccountCurrency,
    extractNyaradzoAccountCurrency,
    extractZetdcAccountCurrency,
    getCimasCurrencyRestrictionMessage,
    getNyaradzoCurrencyRestrictionMessage,
    getZetdcCurrencyRestrictionMessage,
    isAllowedCimasPaymentCurrency,
    isAllowedNyaradzoPaymentCurrency,
    isAllowedZetdcPaymentCurrency,
} from "@/lib/digital-currency-rules";
import { calculateDstvBouquetAmountUsd, getDstvAddOnPackage, getDstvPrimaryPackage } from "@/lib/dstv-packages";
import { convertToUsd, type CurrencyCode } from "@/lib/currency";
import { getExchangeRate } from "@/lib/zb-exchange-rate";

const optionalTrimmedString = () => z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
}, z.string().optional());

const cardDetailsSchema = z.object({
    pan: z.string().trim().min(12).max(32),
    expMonth: z.string().trim().regex(/^\d{1,2}$/),
    expYear: z.string().trim().regex(/^\d{1,4}$/),
    securityCode: z.string().trim().regex(/^\d{3,4}$/),
});

const purchaseSchema = z.object({
    serviceType: z.enum(["ZESA", "AIRTIME", "DSTV", "COUNCILS", "NYARADZO", "CIMAS", "INTERNET"]),
    accountNumber: z.string().min(1),
    amount: z.number().positive("Amount must be greater than zero."),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
    currencyCode: z.enum(["840", "924"]).default("840"),
    customerMobile: optionalTrimmedString().pipe(z.string().min(8).optional()),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    cardDetails: cardDetailsSchema.optional(),
    serviceMeta: z.record(z.string()).optional(),
    validationSnapshot: z.unknown().optional(),
}).superRefine((data, ctx) => {
    if (data.paymentMethod !== "CARD" && !data.customerMobile) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Customer mobile is required for wallet-based payments.",
            path: ["customerMobile"],
        });
    }
    if (data.paymentMethod === "CARD" && !data.cardDetails) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Card details are required for card payments.",
            path: ["cardDetails"],
        });
    }
});

const DIGITAL_SERVICE_IMAGES: Record<string, string> = {
    zesa: "/images/zetdc-logo.png",
    airtime: "/images/airtime_illustration.png",
    dstv: "/images/dstv-logo.png",
    councils: "/images/city-of-harare.png",
    nyaradzo: "/images/nyaradzo-logo.png",
    cimas: "/images/cimas-logo.svg",
    internet: "/images/internet_illustration.png",
};

const REMOVED_SERVICE_TYPES = new Set(["COUNCILS", "INTERNET"]);

function validateDstvServiceMeta(serviceMeta: Record<string, string> | undefined) {
    const paymentType = serviceMeta?.paymentType?.trim().toUpperCase();
    if (paymentType !== "BOUQUET" && paymentType !== "TOPUP") {
        return "DSTV payment type must be BOUQUET or TOPUP.";
    }

    if (paymentType === "TOPUP") {
        return null;
    }

    const bouquet = serviceMeta?.bouquet?.trim();
    if (!bouquet || !getDstvPrimaryPackage(bouquet)) {
        return "Select a valid DSTV bouquet package.";
    }

    const addon = serviceMeta?.addon?.trim() || serviceMeta?.addons?.trim() || "None";
    if (!getDstvAddOnPackage(addon)) {
        return "Select a valid DSTV add-on package.";
    }

    const months = Number(serviceMeta?.months);
    if (!Number.isInteger(months) || months < 1) {
        return "Enter a valid number of months for the DSTV bouquet payment.";
    }

    return null;
}

function isDigitalServiceFieldRequired(serviceType: string, serviceMeta: Record<string, string> | undefined, field: {
    id: string;
    required?: boolean;
}) {
    if (!field.required) {
        return false;
    }

    if (serviceType === "DSTV" && serviceMeta?.paymentType?.trim().toUpperCase() === "TOPUP") {
        return field.id === "paymentType";
    }

    return true;
}

function getDigitalServiceChargeUsd(serviceType: string, serviceMeta: Record<string, string> | undefined) {
    if (serviceType === "DSTV") {
        return serviceMeta?.paymentType?.trim().toUpperCase() === "BOUQUET" ? 3 : 1;
    }
    if (serviceType === "NYARADZO" || serviceType === "CIMAS") {
        return 1;
    }
    return 0;
}

function resolveDstvProviderAmountUsd(amountUsd: number, serviceMeta: Record<string, string> | undefined) {
    const expectedAmount = calculateDstvBouquetAmountUsd(serviceMeta);
    if (expectedAmount === null) {
        return { amountUsd, error: null as string | null };
    }

    const serviceChargeUsd = getDigitalServiceChargeUsd("DSTV", serviceMeta);
    const expectedChargedAmount = Number((expectedAmount + serviceChargeUsd).toFixed(2));
    if (amountsMatch(amountUsd, expectedAmount) || amountsMatch(amountUsd, expectedChargedAmount)) {
        return { amountUsd: expectedAmount, error: null };
    }

    return {
        amountUsd,
        error: `DSTV bouquet amount must match the selected package total: USD ${expectedAmount.toFixed(2)} before the USD ${serviceChargeUsd.toFixed(2)} service charge.`,
    };
}

function providerValidationMessage(serviceLabel: string, message: string) {
    const safeMessage = message.replace(/\bEGRESS\b/gi, "provider").replace(/\bZB[_\s-]?EGRESS\b/gi, "provider");
    return `${serviceLabel} validation was declined by the provider: ${safeMessage}. Please check the account details and try again.`;
}

function digitalProviderUnavailableMessage(context: string) {
    return `${context} is temporarily unavailable because the provider gateway is not responding. Please try again shortly.`;
}

function providerGatewayFailureMessage(serviceLabel: string) {
    return `${serviceLabel} could not be completed by the provider. Please try again shortly or contact support if the problem continues.`;
}

function isPersistenceUnavailableError(error: unknown) {
    if (!error || typeof error !== "object") {
        return false;
    }

    const record = error as { code?: unknown; details?: unknown; message?: unknown };
    const message = [
        typeof record.message === "string" ? record.message : "",
        typeof record.details === "string" ? record.details : "",
    ].join(" ");

    return record.code === 13 && /EHOSTUNREACH|RST_STREAM|Firestore|unreachable/i.test(message);
}

function parseProviderAmount(value: unknown) {
    if (value === undefined || value === null) return undefined;
    const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
}

function currencyCodeFromProviderCurrency(value: unknown): CurrencyCode | undefined {
    const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
    if (normalized === "USD" || normalized === "840") return "840";
    if (normalized === "ZIG" || normalized === "ZWG" || normalized === "ZWL" || normalized === "924") return "924";
    return undefined;
}

function getParsedValidation(raw: unknown) {
    return raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as { parsed?: unknown }).parsed
        : undefined;
}

function asRecord(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : undefined;
}

function getStringValue(record: Record<string, unknown> | undefined, key: string) {
    const value = record?.[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildReusableDstvValidation(accountNumber: string, validationSnapshot: unknown) {
    const snapshot = asRecord(validationSnapshot);
    if (!snapshot) {
        return null;
    }

    const validatedCustomerAccount = getStringValue(snapshot, "customerAccount");
    if (validatedCustomerAccount && validatedCustomerAccount !== accountNumber) {
        return null;
    }

    const parsed = asRecord(snapshot.parsed);
    return {
        success: true,
        accountName: getStringValue(parsed, "customerName") || "DSTV Customer",
        accountNumber,
        billerName: "DSTV",
        amountToBePaid: getStringValue(parsed, "dueAmount"),
        currency: getStringValue(parsed, "currency"),
        raw: snapshot,
    };
}

async function getExpectedProviderAmountUsd(serviceType: string, validationSnapshot: unknown) {
    const parsed = getParsedValidation(validationSnapshot);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return undefined;
    }

    const parsedRecord = parsed as Record<string, unknown>;
    const amount = serviceType === "NYARADZO"
        ? parseProviderAmount(parsedRecord.amountToBePaid)
        : serviceType === "CIMAS"
            ? parseProviderAmount(parsedRecord.currentBalance)
            : undefined;
    const currencyCode = currencyCodeFromProviderCurrency(parsedRecord.currency);
    if (amount === undefined || !currencyCode) {
        return undefined;
    }

    return convertToUsd(amount, currencyCode, currencyCode === "924" ? await getExchangeRate() : 1);
}

function amountsMatch(left: number, right: number) {
    return Math.round(left * 100) === Math.round(right * 100);
}

export async function POST(req: Request) {
    let serviceLabel = "Digital service";
    let initiatedPayment: {
        reference?: string;
        transactionReference?: string;
        status?: string;
    } | null = null;

    try {
        const body = await req.json();
        const validation = purchaseSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.errors[0]?.message || "Invalid payment details." },
                { status: 400 },
            );
        }

        const { serviceType, accountNumber, amount: amountUsd, paymentMethod, currencyCode, customerMobile, customerName, customerEmail, serviceMeta, cardDetails, validationSnapshot } = validation.data;
        let providerAmountUsd = amountUsd;
        if (REMOVED_SERVICE_TYPES.has(serviceType)) {
            return NextResponse.json(
                { success: false, error: "This digital payment service is not available." },
                { status: 404 },
            );
        }
        const customerSession = await verifyCustomerSession();
        const resolvedCustomerEmail = (customerEmail || customerSession?.email || "customer@example.com").toLowerCase();
        const serviceConfig = getDigitalServiceConfig(serviceType.toLowerCase());
        if (!serviceConfig) {
            return NextResponse.json({ success: false, error: "Unsupported digital service." }, { status: 400 });
        }
        serviceLabel = serviceConfig.label;
        if (serviceConfig.validationMode !== "provider" || serviceConfig.purchaseMode !== "provider") {
            return NextResponse.json(
                { success: false, error: serviceConfig.supportMessage || `${serviceConfig.label} is not available yet.` },
                { status: 501 },
            );
        }
        for (const field of serviceConfig.formFields ?? []) {
            if (isDigitalServiceFieldRequired(serviceType, serviceMeta, field) && !(serviceMeta?.[field.id] ?? "").trim()) {
                return NextResponse.json(
                    { success: false, error: `${field.label} is required.` },
                    { status: 400 },
                );
            }
        }
        if (serviceType === "DSTV") {
            if (currencyCode !== "840") {
                return NextResponse.json(
                    { success: false, error: "DStv payments are available in USD only." },
                    { status: 400 },
                );
            }
            const dstvError = validateDstvServiceMeta(serviceMeta);
            if (dstvError) {
                return NextResponse.json({ success: false, error: dstvError }, { status: 400 });
            }
            const dstvAmountResult = resolveDstvProviderAmountUsd(amountUsd, serviceMeta);
            if (dstvAmountResult.error) {
                return NextResponse.json({ success: false, error: dstvAmountResult.error }, { status: 400 });
            }
            providerAmountUsd = dstvAmountResult.amountUsd;
        }
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (!baseUrl) {
            return NextResponse.json({ success: false, error: "NEXT_PUBLIC_BASE_URL missing" }, { status: 500 });
        }

        let accountInfo: Awaited<ReturnType<typeof DigitalService.validateAccount>>;
        const reusableDstvValidation = serviceType === "DSTV"
            ? buildReusableDstvValidation(accountNumber, validationSnapshot)
            : null;
        if (reusableDstvValidation) {
            accountInfo = reusableDstvValidation;
        } else {
            try {
                accountInfo = await DigitalService.validateAccount(serviceType, accountNumber, serviceMeta);
            } catch (error) {
                if (error instanceof EgressGatewayError) {
                    if (isEgressServiceUnavailable(error)) {
                        return NextResponse.json(
                            {
                                success: false,
                                error: digitalProviderUnavailableMessage(`${serviceLabel} validation`),
                                code: "SERVICE_UNAVAILABLE",
                                gatewayStatus: error.status,
                            },
                            { status: 503 },
                        );
                    }

                    console.warn("Digital provider validation declined:", {
                        serviceType,
                        status: error.status,
                        message: error.message,
                    });
                    return NextResponse.json(
                        {
                            success: false,
                            error: providerValidationMessage(serviceLabel, error.message),
                            code: "PROVIDER_VALIDATION_FAILED",
                            gatewayStatus: error.status,
                        },
                        { status: error.status >= 400 && error.status < 500 ? error.status : 502 },
                    );
                }
                throw error;
            }
        }
        const normalizedServiceId = serviceType.toLowerCase() as "zesa" | "airtime" | "dstv" | "councils" | "nyaradzo" | "cimas" | "internet";
        const resolvedAccountNumber = accountInfo.accountNumber || accountNumber;
        const resolvedCustomerName = customerName || customerSession?.name || accountInfo.accountName || "Digital Customer";
        const expectedProviderAmountUsd = await getExpectedProviderAmountUsd(serviceType, accountInfo.raw);
        if (serviceType === "NYARADZO" && expectedProviderAmountUsd !== undefined && !amountsMatch(providerAmountUsd, expectedProviderAmountUsd)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `${serviceLabel} amount must match the validated full account balance.`,
                },
                { status: 400 },
            );
        }
        const serviceChargeUsd = getDigitalServiceChargeUsd(serviceType, serviceMeta);
        const chargeAmountUsd = Number((providerAmountUsd + serviceChargeUsd).toFixed(2));
        const accountCurrency = serviceType === "ZESA" ? extractZetdcAccountCurrency(accountInfo.raw) : undefined;
        const nyaradzoAccountCurrency = serviceType === "NYARADZO" ? extractNyaradzoAccountCurrency(accountInfo.raw) : undefined;
        const cimasAccountCurrency = serviceType === "CIMAS" ? extractCimasAccountCurrency(accountInfo.raw) : undefined;
        if (serviceType === "ZESA") {
            if (!isAllowedZetdcPaymentCurrency(accountCurrency, currencyCode)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: getZetdcCurrencyRestrictionMessage(accountCurrency)
                            || "This ZETDC account does not accept the selected payment currency.",
                    },
                    { status: 400 },
                );
            }
        }
        if (serviceType === "NYARADZO") {
            if (!isAllowedNyaradzoPaymentCurrency(nyaradzoAccountCurrency, currencyCode)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: getNyaradzoCurrencyRestrictionMessage(nyaradzoAccountCurrency)
                            || "This Nyaradzo policy does not accept the selected payment currency.",
                    },
                    { status: 400 },
                );
            }
        }
        if (serviceType === "CIMAS") {
            if (!isAllowedCimasPaymentCurrency(cimasAccountCurrency, currencyCode)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: getCimasCurrencyRestrictionMessage(cimasAccountCurrency)
                            || "This CIMAS account does not accept the selected payment currency.",
                    },
                    { status: 400 },
                );
            }
        }
        const enrichedServiceMeta = {
            ...(serviceMeta ?? {}),
            accountName: accountInfo.accountName ?? "",
            billerName: accountInfo.billerName ?? serviceConfig.label,
            validatedAccountNumber: resolvedAccountNumber,
            providerAmountUsd: providerAmountUsd.toFixed(2),
            serviceChargeUsd: serviceChargeUsd.toFixed(2),
            ...(accountCurrency ? { accountCurrency } : {}),
            ...(nyaradzoAccountCurrency ? { accountCurrency: nyaradzoAccountCurrency } : {}),
            ...(cimasAccountCurrency ? { accountCurrency: cimasAccountCurrency } : {}),
        };

        const initiateResult = await DigitalService.initiatePurchase({
            serviceType,
            accountNumber: resolvedAccountNumber,
            amount: chargeAmountUsd,
            paymentMethod,
            currencyCode,
            customerMobile,
            email: resolvedCustomerEmail,
            cardDetails: cardDetails as CardPaymentDetails | undefined,
            serviceMeta: enrichedServiceMeta,
        }, baseUrl);
        initiatedPayment = {
            reference: initiateResult.reference,
            transactionReference: initiateResult.transactionReference,
            status: initiateResult.status,
        };

        const serviceChargeLocal = Number((serviceChargeUsd * initiateResult.exchangeRate).toFixed(2));
        const basePriceLocal = Number((initiateResult.amount - serviceChargeLocal).toFixed(2));
        const items = [{
            id: `${serviceType.toLowerCase()}-${resolvedAccountNumber}`,
            name: `${serviceConfig.label} Purchase`,
            price: basePriceLocal,
            quantity: 1,
            image: DIGITAL_SERVICE_IMAGES[serviceType.toLowerCase()] ?? "/images/logo.webp",
        }];

        if (serviceChargeUsd > 0) {
            items.push({
                id: `fee-${serviceType.toLowerCase()}`,
                name: "Platform Convenience Fee",
                price: serviceChargeLocal,
                quantity: 1,
                image: "/images/logo.webp",
            });
        }

        await createPendingOrder({
            reference: initiateResult.reference,
            items,
            subtotal: initiateResult.amount,
            deliveryFee: 0,
            total: initiateResult.amount,
            subtotalUsd: initiateResult.amountUsd,
            deliveryFeeUsd: 0,
            totalUsd: initiateResult.amountUsd,
            exchangeRate: initiateResult.exchangeRate,
            currencyCode: initiateResult.currencyCode,
            customerName: resolvedCustomerName,
            customerEmail: resolvedCustomerEmail,
            customerPhone: customerMobile,
            deliveryMethod: "collect",
            paymentMethod: paymentMethod.toLowerCase(),
            notes: `${serviceConfig.label} for ${resolvedAccountNumber} (${accountInfo.accountName ?? "Validated account"}). Provider amount USD ${providerAmountUsd.toFixed(2)}; service charge USD ${serviceChargeUsd.toFixed(2)}.`,
            recordEngagement: false,
            queueNotification: false,
            ensureShipment: false,
        });

        await Promise.all([
            upsertDigitalOrder({
                orderReference: initiateResult.reference,
                serviceId: normalizedServiceId,
                provider: serviceConfig.provider,
                accountReference: resolvedAccountNumber,
                customerEmail: resolvedCustomerEmail,
                customerName: resolvedCustomerName,
                validationSnapshot: accountInfo.raw ?? {
                    accountName: accountInfo.accountName,
                    accountNumber: accountInfo.accountNumber,
                    billerName: accountInfo.billerName,
                },
                provisioningStatus: "pending",
                resultPayload: {
                    transactionReference: initiateResult.transactionReference,
                    status: initiateResult.status,
                    paymentUrl: initiateResult.paymentUrl,
                    authenticationStatus: initiateResult.authenticationStatus,
                    processingMode: "provider",
                    providerAmountUsd,
                    serviceChargeUsd,
                    chargedAmountUsd: chargeAmountUsd,
                    serviceMeta: enrichedServiceMeta,
                },
            }),
            setOrderStatus(
                initiateResult.reference,
                initiateResult.status,
                {
                    gatewayReference: initiateResult.transactionReference,
                    accountNumber: resolvedAccountNumber,
                    serviceType,
                    serviceMeta: enrichedServiceMeta,
                    customerName: resolvedCustomerName,
                    customerMobile,
                    currencyCode,
                    providerAmountUsd,
                    serviceChargeUsd,
                    chargedAmountUsd: chargeAmountUsd,
                },
                {
                    queuePaymentNotification: false,
                    createRefundCaseOnCancel: false,
                    recordEngagement: false,
                    syncShipment: false,
                },
            ),
        ]);

        return NextResponse.json({
            success: true,
            reference: initiateResult.reference,
            transactionReference: initiateResult.transactionReference,
            paymentUrl: initiateResult.paymentUrl,
            redirectHtml: initiateResult.redirectHtml,
            authenticationStatus: initiateResult.authenticationStatus,
            status: initiateResult.status,
            providerAmountUsd,
            serviceChargeUsd,
            chargedAmountUsd: chargeAmountUsd,
            message: initiateResult.message || "Payment initiated.",
        });

    } catch (error) {
        if (error instanceof DigitalServiceUnavailableError) {
            return NextResponse.json(
                { success: false, error: error.message, code: "SERVICE_UNAVAILABLE" },
                { status: error.status }
            );
        }
        if (error instanceof SmilePayGatewayError) {
            console.warn("Smile Pay gateway rejected digital purchase:", {
                status: error.status,
                message: error.message,
            });
            return NextResponse.json(
                {
                    success: false,
                    error: error.message,
                    code: "PROVIDER_GATEWAY_FAILED",
                    gatewayStatus: error.status,
                },
                { status: error.status >= 400 && error.status < 500 ? error.status : 502 }
            );
        }
        if (error instanceof EgressGatewayError) {
            if (isEgressServiceUnavailable(error)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: digitalProviderUnavailableMessage(`${serviceLabel} payments`),
                        code: "SERVICE_UNAVAILABLE",
                        gatewayStatus: error.status,
                    },
                    { status: 503 }
                );
            }
            return NextResponse.json(
                {
                    success: false,
                    error: providerGatewayFailureMessage(serviceLabel),
                    code: "PROVIDER_GATEWAY_FAILED",
                    gatewayStatus: error.status,
                },
                { status: error.status >= 400 && error.status < 500 ? error.status : 502 }
            );
        }
        if (isPersistenceUnavailableError(error)) {
            console.error("Digital purchase persistence unavailable:", {
                serviceLabel,
                reference: initiatedPayment?.reference,
                transactionReference: initiatedPayment?.transactionReference,
                status: initiatedPayment?.status,
                message: error instanceof Error ? error.message : "Persistence unavailable",
            });
            return NextResponse.json(
                {
                    success: false,
                    error: "We could not save the payment request because the order database is temporarily unreachable. Please try again shortly.",
                    code: "PERSISTENCE_UNAVAILABLE",
                    reference: initiatedPayment?.reference,
                    transactionReference: initiatedPayment?.transactionReference,
                    status: initiatedPayment?.status,
                },
                { status: 503 },
            );
        }
        console.error("Digital purchase error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Purchase failed" },
            { status: 500 }
        );
    }
}
