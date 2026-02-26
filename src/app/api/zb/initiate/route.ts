import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';

const initiateZBSchema = z.object({
    meterNumber: z.string().min(1, "Meter number is required"),
    amount: z.number().min(2, "Minimum amount is $2.00"),
});

// ZB Merchant credentials from environment - using fallbacks for local dev
const ZB_MERCHANT_ID = process.env.ZB_MERCHANT_ID || "MOCK_ZB_ID";
const ZB_MERCHANT_KEY = process.env.ZB_MERCHANT_KEY || "MOCK_ZB_KEY";
const ZB_API_URL = process.env.ZB_API_URL || "https://mock.zb.co.zw/api/v1/checkout";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = initiateZBSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
        }

        const { meterNumber, amount } = validation.data;

        // Create a unique transaction reference
        const reference = `ZB-ZESA-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        // In a real integration, we would build the specific payload required by ZB
        // and sign it using their exact specifications (e.g., HMAC SHA256)
        const payload = {
            merchantId: ZB_MERCHANT_ID,
            reference,
            amount,
            currency: "USD",
            returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/store/zesa-tokens?ref=${reference}`,
            // Pass the meter number back to us as metadata so we can fulfill it
            metadata: {
                meterNumber,
                product: "ZESA_TOKEN"
            }
        };

        // Example signature calculation
        const payloadString = JSON.stringify(payload);
        const signature = crypto
            .createHmac('sha256', ZB_MERCHANT_KEY)
            .update(payloadString)
            .digest('hex');

        // If ZB_API_URL is the mock one, we bypass the real fetch and return a simulated ZB payment URL
        if (ZB_API_URL.includes("mock.zb.co.zw")) {
            // Return a simulated redirect URL - in reality, this would be the actual ZB checkout page
            const simulatedCheckoutUrl = `/store/zesa-tokens?action=mock-zb-flow&ref=${reference}&amount=${amount}&meter=${meterNumber}`;
            return NextResponse.json({
                success: true,
                redirectUrl: simulatedCheckoutUrl,
                reference
            });
        }

        // Call the actual ZB Merchant API
        const response = await fetch(ZB_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': signature
            },
            body: payloadString
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to initiate ZB payment");
        }

        // Assuming the ZB API returns a checkoutUrl parameter to redirect the user
        return NextResponse.json({
            success: true,
            redirectUrl: data.checkoutUrl,
            reference
        });

    } catch (error) {
        console.error('Error initiating ZB payment:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to initiate ZB payment.' },
            { status: 500 }
        );
    }
}
