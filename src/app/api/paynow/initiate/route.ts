import { NextResponse } from 'next/server';
import { paynow } from '@/lib/payments/paynow';
import { z } from 'zod';
import { savePollUrl } from '@/server/orders';

const initiatePaymentSchema = z.object({
  reference: z.string(),
  email: z.string().email().optional(),
  items: z.array(z.object({
    name: z.string(),
    price: z.number(),
  })),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = initiatePaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
    }

    let { reference, email, items } = validation.data;

    if (process.env.NODE_ENV === 'development') {
      email = process.env.PAYNOW_MERCHANT_EMAIL;
    }

    const payment = paynow.createPayment(reference, email);

    items.forEach(item => {
      payment.add(item.name, item.price);
    });

    const response = await paynow.send(payment);

    if (response.success) {
      await savePollUrl(reference, response.pollUrl);
      return NextResponse.json({ success: true, redirectUrl: response.redirectUrl });
    } else {
      return NextResponse.json({ success: false, error: response.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Error initiating Paynow payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate Paynow payment.' },
      { status: 500 }
    );
  }
}
