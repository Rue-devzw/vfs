import { NextResponse } from 'next/server';

import { URLSearchParams } from 'url';
import crypto from 'crypto';
import { setOrderStatus } from '@/server/orders';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const hash = params.get('hash');
    params.delete('hash');

    const stringifiedParams = Array.from(params.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([, value]) => decodeURIComponent(value))
      .join('') + process.env.PAYNOW_INTEGRATION_KEY;

    const calculatedHash = crypto.createHash('sha512').update(stringifiedParams).digest('hex').toUpperCase();

    if (calculatedHash !== hash?.toUpperCase()) {
      console.warn('Paynow IPN hash mismatch', { calculatedHash, hash });
      return NextResponse.json({ success: false, error: 'Invalid hash' }, { status: 400 });
    }

    const status = params.get('status');
    const reference = params.get('reference');
    const paynowreference = params.get('paynowreference');

    if (status && reference) {
      await setOrderStatus(reference, status.toLowerCase() as "pending" | "processing" | "shipped" | "delivered" | "cancelled", { paynowreference });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling Paynow IPN:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to handle Paynow IPN.' },
      { status: 500 }
    );
  }
}
