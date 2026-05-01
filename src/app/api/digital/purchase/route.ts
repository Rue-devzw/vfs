import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingOrder, setOrderStatus } from "@/server/orders";
import { DigitalService, DigitalServiceUnavailableError } from "@/lib/digital-service-logic";
import { getDigitalServiceConfig } from "@/lib/digital-services";
import { upsertDigitalOrder } from "@/lib/firestore/digital-orders";
import {
    EgressGatewayError,
    getEgressServiceUnavailableMessage,
    isEgressServiceUnavailable,
} from "@/lib/payments/egress";
import { SmilePayGatewayError } from "@/lib/payments/smile-pay";
import { PAYMENT_METHOD_VALUES } from "@/lib/payment-methods";
import type { CardPaymentDetails } from "@/lib/payments/types";
import { verifyCustomerSession } from "@/lib/auth";
import {
    extractZetdcAccountCurrency,
    getZetdcCurrencyRestrictionMessage,
    isAllowedZetdcPaymentCurrency,
} from "@/lib/digital-currency-rules";
import { calculateDstvBouquetAmountUsd, getDstvAddOnPackage, getDstvPrimaryPackage } from "@/lib/dstv-packages";

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
    amount: z.number().min(1),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
    currencyCode: z.enum(["840", "924"]).default("840"),
    customerMobile: optionalTrimmedString().pipe(z.string().min(8).optional()),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    cardDetails: cardDetailsSchema.optional(),
    serviceMeta: z.record(z.string()).optional(),
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

function validateDstvPaymentAmount(amountUsd: number, serviceMeta: Record<string, string> | undefined) {
    const expectedAmount = calculateDstvBouquetAmountUsd(serviceMeta);
    if (expectedAmount === null) {
        return null;
    }

    if (Math.round(amountUsd * 100) !== Math.round(expectedAmount * 100)) {
        return `DSTV bouquet amount must match the selected package total: USD ${expectedAmount.toFixed(2)}.`;
    }

    return null;
}

function providerValidationMessage(serviceLabel: string, message: string) {
    return `${serviceLabel} validation was declined by the provider: ${message}. Please check the account details and try again.`;
}

export async function POST(req: Request) {
    let serviceLabel = "Digital service";

    try {
        const body = await req.json();
        const validation = purchaseSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.errors[0]?.message || "Invalid payment details." },
                { status: 400 },
            );
        }

        const { serviceType, accountNumber, amount: amountUsd, paymentMethod, currencyCode, customerMobile, customerName, customerEmail, serviceMeta, cardDetails } = validation.data;
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
            if (field.required && !(serviceMeta?.[field.id] ?? "").trim()) {
                return NextResponse.json(
                    { success: false, error: `${field.label} is required.` },
                    { status: 400 },
                );
            }
        }
        if (serviceType === "DSTV") {
            const dstvError = validateDstvServiceMeta(serviceMeta);
            if (dstvError) {
                return NextResponse.json({ success: false, error: dstvError }, { status: 400 });
            }
            const dstvAmountError = validateDstvPaymentAmount(amountUsd, serviceMeta);
            if (dstvAmountError) {
                return NextResponse.json({ success: false, error: dstvAmountError }, { status: 400 });
            }
        }
        if (serviceType === "COUNCILS" && currencyCode !== "924") {
            return NextResponse.json(
                { success: false, error: "City of Harare payments are available in ZiG only." },
                { status: 400 },
            );
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (!baseUrl) {
            return NextResponse.json({ success: false, error: "NEXT_PUBLIC_BASE_URL missing" }, { status: 500 });
        }

        let accountInfo: Awaited<ReturnType<typeof DigitalService.validateAccount>>;
        try {
            accountInfo = await DigitalService.validateAccount(serviceType, accountNumber, serviceMeta);
        } catch (error) {
            if (error instanceof EgressGatewayError) {
                if (isEgressServiceUnavailable(error)) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: getEgressServiceUnavailableMessage(`${serviceLabel} validation`),
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
        const normalizedServiceId = serviceType.toLowerCase() as "zesa" | "airtime" | "dstv" | "councils" | "nyaradzo" | "cimas" | "internet";
        const resolvedAccountNumber = accountInfo.accountNumber || accountNumber;
        const resolvedCustomerName = customerName || customerSession?.name || accountInfo.accountName || "Digital Customer";
        const accountCurrency = serviceType === "ZESA" ? extractZetdcAccountCurrency(accountInfo.raw) : undefined;
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
        const enrichedServiceMeta = {
            ...(serviceMeta ?? {}),
            accountName: accountInfo.accountName ?? "",
            billerName: accountInfo.billerName ?? serviceConfig.label,
            validatedAccountNumber: resolvedAccountNumber,
            ...(accountCurrency ? { accountCurrency } : {}),
        };

        // 2. Initiate Payment
        const initiateResult = await DigitalService.initiatePurchase({
            serviceType,
            accountNumber: resolvedAccountNumber,
            amount: amountUsd,
            paymentMethod,
            currencyCode,
            customerMobile,
            email: resolvedCustomerEmail,
            cardDetails: cardDetails as CardPaymentDetails | undefined,
            serviceMeta: enrichedServiceMeta,
        }, baseUrl);

        // 3. Create Pending Order for Tracking
        await createPendingOrder({
            reference: initiateResult.reference,
            items: [{
                id: `${serviceType.toLowerCase()}-${resolvedAccountNumber}`,
                name: `${serviceConfig.label} Purchase`,
                price: initiateResult.amount,
                quantity: 1,
                image: DIGITAL_SERVICE_IMAGES[serviceType.toLowerCase()] ?? "/images/logo.webp",
            }],
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
            notes: `${serviceConfig.label} for ${resolvedAccountNumber} (${accountInfo.accountName ?? "Validated account"})`,
        });

        await upsertDigitalOrder({
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
                serviceMeta: enrichedServiceMeta,
            },
        });

        await setOrderStatus(initiateResult.reference, initiateResult.status, {
            gatewayReference: initiateResult.transactionReference,
            accountNumber: resolvedAccountNumber,
            serviceType,
            serviceMeta: enrichedServiceMeta,
            customerName: resolvedCustomerName,
            customerMobile,
            currencyCode,
        });

        return NextResponse.json({
            success: true,
            reference: initiateResult.reference,
            transactionReference: initiateResult.transactionReference,
            paymentUrl: initiateResult.paymentUrl,
            redirectHtml: initiateResult.redirectHtml,
            authenticationStatus: initiateResult.authenticationStatus,
            status: initiateResult.status,
            message: initiateResult.message || "Payment initiated.",
        });

    } catch (error) {
        console.error("Digital purchase error - FULL DETAILS:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        if (error instanceof DigitalServiceUnavailableError) {
            return NextResponse.json(
                { success: false, error: error.message, code: "SERVICE_UNAVAILABLE" },
                { status: error.status }
            );
        }
        if (error instanceof SmilePayGatewayError) {
            console.error("Smile Pay gateway response:", {
                status: error.status,
                message: error.message,
                responseBody: error.responseBody,
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
                        error: getEgressServiceUnavailableMessage(`${serviceLabel} payments`),
                        code: "SERVICE_UNAVAILABLE",
                        gatewayStatus: error.status,
                    },
                    { status: 503 }
                );
            }
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
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Purchase failed" },
            { status: 500 }
        );
    }
}
