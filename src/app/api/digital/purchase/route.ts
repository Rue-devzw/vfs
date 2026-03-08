import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingOrder, setOrderStatus } from "@/server/orders";
import { DigitalService } from "@/lib/digital-service-logic";

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

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (!baseUrl) {
            return NextResponse.json({ success: false, error: "NEXT_PUBLIC_BASE_URL missing" }, { status: 500 });
        }

        // 1. Initial Validation with Biller (Mocked for now)
        const accountInfo = await DigitalService.validateAccount(serviceType, accountNumber);

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
                name: `${serviceType} Purchase`,
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
            paymentMethod: paymentMethod.toLowerCase(),
            notes: `${serviceType} for ${accountNumber} (${accountInfo.accountName})`,
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
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Purchase failed" },
            { status: 500 }
        );
    }
}
