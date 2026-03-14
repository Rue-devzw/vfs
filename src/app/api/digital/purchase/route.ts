import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingOrder, setOrderStatus } from "@/server/orders";
import { DigitalService, DigitalServiceUnavailableError } from "@/lib/digital-service-logic";
import { getDigitalServiceConfig } from "@/lib/digital-services";
import { upsertDigitalOrder } from "@/lib/firestore/digital-orders";
import { ZbGatewayError } from "@/lib/payments/zb";

const purchaseSchema = z.object({
    serviceType: z.enum(["ZESA", "AIRTIME", "DSTV", "COUNCILS", "NYARADZO", "INTERNET"]),
    accountNumber: z.string().min(1),
    amount: z.number().min(1),
    paymentMethod: z.enum(["WALLETPLUS", "ECOCASH", "INNBUCKS", "OMARI", "CARD"]),
    currencyCode: z.enum(["840", "924"]).default("840"),
    customerMobile: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = purchaseSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
        }

        const { serviceType, accountNumber, amount: amountUsd, paymentMethod, currencyCode, customerMobile, customerName, customerEmail } = validation.data;
        const serviceConfig = getDigitalServiceConfig(serviceType.toLowerCase());
        if (!serviceConfig) {
            return NextResponse.json({ success: false, error: "Unsupported digital service." }, { status: 400 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (!baseUrl) {
            return NextResponse.json({ success: false, error: "NEXT_PUBLIC_BASE_URL missing" }, { status: 500 });
        }

        const accountInfo = await DigitalService.validateAccount(serviceType, accountNumber);
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
        }, baseUrl);

        // 3. Create Pending Order for Tracking
        await createPendingOrder({
            reference: initiateResult.reference,
            items: [{
                id: `${serviceType.toLowerCase()}-${accountNumber}`,
                name: `${serviceConfig.label} Purchase`,
                price: initiateResult.amount,
                quantity: 1,
                image: `/images/${serviceType.toLowerCase()}.webp`,
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
            notes: `${serviceConfig.label} for ${accountNumber} (${accountInfo.accountName})`,
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
            },
        });

        await setOrderStatus(initiateResult.reference, initiateResult.status, {
            gatewayReference: initiateResult.transactionReference,
            accountNumber,
            serviceType,
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
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Purchase failed" },
            { status: 500 }
        );
    }
}
