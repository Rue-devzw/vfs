import { NextResponse } from 'next/server';
import { initiateEcocashPayment } from '@/lib/payments/ecocash';
import { isFirebaseConfigured } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'EcoCash payments are temporarily unavailable. Please try again soon.',
        },
        { status: 503 },
      );
    }

    const body = await req.json();
    const amount = Number(body?.amount);
    const phoneNumber: string | undefined = body?.phoneNumber;
    const currency: string = body?.currency ?? 'USD';
    const metadata = body?.metadata;
    const orderId: string | undefined = body?.orderId;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'A valid payment amount is required.' },
        { status: 400 },
      );
    }

    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      return NextResponse.json(
        { success: false, error: 'An EcoCash phone number is required.' },
        { status: 400 },
      );
    }

    const payment = await initiateEcocashPayment({
      amount,
      phoneNumber: phoneNumber.trim(),
      currency,
      metadata,
      orderId,
    });

    return NextResponse.json({ success: true, ...payment });
  } catch (error) {
    console.error('Error initiating EcoCash payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate EcoCash payment.' },
      { status: 500 },
    );
  }
}
