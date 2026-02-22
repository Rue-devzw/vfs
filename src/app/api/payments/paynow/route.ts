import { NextResponse } from 'next/server';
import { initiatePaynowPayment } from '@/lib/payments/paynow';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, phoneNumber, metadata } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'A Paynow phone number is required.' },
        { status: 400 }
      );
    }

    const payment = await initiatePaynowPayment({
      amount,
      phoneNumber,
      metadata,
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error initiating Paynow payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate Paynow payment.' },
      { status: 500 }
    );
  }
}
