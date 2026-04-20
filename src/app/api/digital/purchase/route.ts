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
    serviceType: z.enum(["ZESA", "AIRTIME", "DSTV", "COUNCILS", "NYARADZO", "INTERNET"]),
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
    zesa: "/images/Zesa.webp",
    airtime: "/images/airtime_illustration.png",
    dstv: "/images/dstv-logo.png",
    councils: "/images/city-of-harare.png",
    nyaradzo: "/images/nyaradzo-logo.png",
    internet: "/images/internet_illustration.png",
};

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
        const serviceConfig = getDigitalServiceConfig(serviceType.toLowerCase());
        if (!serviceConfig) {
            return NextResponse.json({ success: false, error: "Unsupported digital service." }, { status: 400 });
        }
        serviceLabel = serviceConfig.label;
        for (const field of serviceConfig.formFields ?? []) {
            if (field.required && !(serviceMeta?.[field.id] ?? "").trim()) {
                return NextResponse.json(
                    { success: false, error: `${field.label} is required.` },
                    { status: 400 },
                );
            }
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (!baseUrl) {
            return NextResponse.json({ success: false, error: "NEXT_PUBLIC_BASE_URL missing" }, { status: 500 });
        }

        const accountInfo = serviceConfig.validationMode === "provider"
            ? await DigitalService.validateAccount(serviceType, accountNumber, serviceMeta)
            : {
                success: true,
                accountName: "Manual verification pending",
                accountNumber,
                billerName: serviceConfig.label,
                raw: {
                    mode: "manual_review",
                    accountNumber,
                    billerName: serviceConfig.label,
                },
            };
        const normalizedServiceId = serviceType.toLowerCase() as "zesa" | "airtime" | "dstv" | "councils" | "nyaradzo" | "internet";
        const resolvedAccountNumber = accountInfo.accountNumber || accountNumber;
        const resolvedCustomerName = customerName || accountInfo.accountName || "Digital Customer";
        const enrichedServiceMeta = {
            ...(serviceMeta ?? {}),
            accountName: accountInfo.accountName ?? "",
            billerName: accountInfo.billerName ?? serviceConfig.label,
            validatedAccountNumber: resolvedAccountNumber,
        };

        // 2. Initiate Payment
        const initiateResult = await DigitalService.initiatePurchase({
            serviceType,
            accountNumber: resolvedAccountNumber,
            amount: amountUsd,
            paymentMethod,
            currencyCode,
            customerMobile,
            email: customerEmail,
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
            customerEmail: customerEmail || "customer@example.com",
            customerPhone: customerMobile,
            deliveryMethod: "collect",
            paymentMethod: paymentMethod.toLowerCase(),
            notes: `${serviceConfig.label} for ${resolvedAccountNumber} (${accountInfo.accountName ?? "Manual verification pending"})`,
        });

        await upsertDigitalOrder({
            orderReference: initiateResult.reference,
            serviceId: normalizedServiceId,
            provider: serviceConfig.provider,
            accountReference: resolvedAccountNumber,
            customerEmail,
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
                processingMode: serviceConfig.validationMode === "manual" ? "manual_review" : "provider",
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
