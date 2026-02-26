import { NextResponse } from 'next/server';
import crypto from 'crypto';

const ZB_MERCHANT_KEY = process.env.ZB_MERCHANT_KEY || "MOCK_ZB_KEY";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Webhook verification pattern
        const signature = req.headers.get('x-signature');

        if (signature) {
            const payloadString = JSON.stringify(body);
            const expectedSignature = crypto
                .createHmac('sha256', ZB_MERCHANT_KEY)
                .update(payloadString)
                .digest('hex');

            if (signature !== expectedSignature) {
                console.error("Invalid ZB webhook signature");
                return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
            }
        }

        const { reference, status, metadata } = body;

        // Check if payment was successful
        if (status === "PAID" || status === "SUCCESS") {
            console.log(`Payment successful for ZESA reference: ${reference} and meter: ${metadata?.meterNumber}`);

            // At this point, you would:
            // 1. Mark transaction as paid in database
            // 2. Actually purchase the ZESA token from your downstream provider 
            // 3. Email or SMS the token to the user

            // e.g., await fulfillZesaToken(reference, metadata.meterNumber)
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('Error processing ZB webhook:', error);
        return NextResponse.json(
            { error: 'Failed to process webhook.' },
            { status: 500 }
        );
    }
}
