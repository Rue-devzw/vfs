import { NextResponse } from 'next/server';
import { setOrderStatus } from '@/server/orders';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const webhookSecret = process.env.ZB_WEBHOOK_SECRET;
        if (webhookSecret) {
            const secretHeader = req.headers.get('x-webhook-secret');
            if (secretHeader !== webhookSecret) {
                return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
            }
        }

        const body = await req.json();
        const rawStatus = typeof body?.status === "string" ? body.status : "PENDING";
        const reference = typeof body?.orderReference === "string"
            ? body.orderReference
            : typeof body?.reference === "string"
                ? body.reference
                : "";

        if (!reference) {
            return NextResponse.json({ error: "Missing reference." }, { status: 400 });
        }

        const merchantSecret = process.env.ZB_API_SECRET;
        const signature = req.headers.get('x-signature');
        if (signature) {
            if (!merchantSecret) {
                return NextResponse.json({ error: "ZB_API_SECRET is required for signature validation." }, { status: 500 });
            }
            const payloadString = JSON.stringify(body);
            const expectedSignature = crypto
                .createHmac('sha256', merchantSecret)
                .update(payloadString)
                .digest('hex');

            if (signature !== expectedSignature) {
                console.error("Invalid ZB webhook signature");
                return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
            }
        }

        await setOrderStatus(reference, rawStatus, {
            gatewayReference: body?.reference,
            paymentOption: body?.paymentOption,
            amount: body?.amount,
            currency: body?.currency,
        });

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('Error processing ZB webhook:', error);
        return NextResponse.json(
            { error: 'Failed to process webhook.' },
            { status: 500 }
        );
    }
}
