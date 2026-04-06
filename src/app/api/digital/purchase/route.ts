import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingOrder, setOrderStatus } from "@/server/orders";
import { DigitalService, DigitalServiceUnavailableError } from "@/lib/digital-service-logic";
import { getDigitalServiceConfig } from "@/lib/digital-services";
import { upsertDigitalOrder } from "@/lib/firestore/digital-orders";
import { EgressGatewayError } from "@/lib/payments/egress";
import { ZbGatewayError } from "@/lib/payments/zb";
import { PAYMENT_METHOD_VALUES } from "@/lib/payment-methods";

const purchaseSchema = z.object({
    serviceType: z.enum(["ZESA", "AIRTIME", "DSTV", "COUNCILS", "NYARADZO", "INTERNET"]),
    accountNumber: z.string().min(1),
    amount: z.number().min(1),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
    currencyCode: z.enum(["840", "924"]).default("840"),
    customerMobile: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    serviceMeta: z.record(z.string()).optional(),
});

const DIGITAL_SERVICE_IMAGES: Record<string, string> = {
    zesa: "/images/Zesa.webp",
    airtime: "/images/airtime_illustration.png",
    dstv: "/images/dstv_illustration.png",
    councils: "/images/councils_illustration.png",
    nyaradzo: "/images/insurance_illustration.png",
    internet: "/images/internet_illustration.png",
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = purchaseSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
        }

        const { serviceType, accountNumber, amount: amountUsd, paymentMethod, currencyCode, customerMobile, customerName, customerEmail, serviceMeta } = validation.data;
        const serviceConfig = getDigitalServiceConfig(serviceType.toLowerCase());
        if (!serviceConfig) {
            return NextResponse.json({ success: false, error: "Unsupported digital service." }, { status: 400 });
        }
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

        // 2. Initiate Payment
        const initiateResult = await DigitalService.initiatePurchase({
            serviceType,
            accountNumber,
            amount: amountUsd,
            paymentMethod,
            currencyCode,
            customerMobile,
            email: customerEmail,
            serviceMeta,
        }, baseUrl);

        // 3. Create Pending Order for Tracking
        await createPendingOrder({
            reference: initiateResult.reference,
            items: [{
                id: `${serviceType.toLowerCase()}-${accountNumber}`,
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
            customerName: customerName || "Digital Customer",
            customerEmail: customerEmail || "customer@example.com",
            customerPhone: customerMobile,
            deliveryMethod: "collect",
            paymentMethod: paymentMethod.toLowerCase(),
            notes: `${serviceConfig.label} for ${accountNumber} (${accountInfo.accountName ?? "Manual verification pending"})`,
        });

        await upsertDigitalOrder({
            orderReference: initiateResult.reference,
            serviceId: normalizedServiceId,
            provider: serviceConfig.provider,
            accountReference: accountNumber,
            customerEmail,
            customerName,
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
                processingMode: serviceConfig.validationMode === "manual" ? "manual_review" : "provider",
                serviceMeta,
            },
        });

        await setOrderStatus(initiateResult.reference, initiateResult.status, {
            gatewayReference: initiateResult.transactionReference,
            accountNumber,
            serviceType,
            serviceMeta,
            customerName: customerName || "Digital Customer",
            customerMobile,
            currencyCode,
        });

        return NextResponse.json({
            success: true,
            reference: initiateResult.reference,
            transactionReference: initiateResult.transactionReference,
            paymentUrl: initiateResult.paymentUrl,
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
        if (error instanceof ZbGatewayError) {
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
