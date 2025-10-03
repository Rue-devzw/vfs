import { randomUUID } from 'crypto';
main

const DEFAULT_MERCHANT_CODE = '068951';

interface InitiateEcocashPaymentOptions {
  amount: number;
  phoneNumber: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  orderId?: string;
}

interface InitiateEcocashPaymentResponse {
  reference: string;
  merchantCode: string;
}

export async function initiateEcocashPayment({
  amount,
  phoneNumber,
  currency = 'USD',
  metadata,
  orderId,
}: InitiateEcocashPaymentOptions): Promise<InitiateEcocashPaymentResponse> {
  const merchantCode = process.env.ECOCASH_MERCHANT_CODE?.trim() || DEFAULT_MERCHANT_CODE;

  const reference = `ECO-${randomUUID().split('-')[0]}`.toUpperCase();

main
  const db = getDb();

  const paymentRecord: Record<string, unknown> = {
    provider: 'ecocash',
    merchantCode,
    phoneNumber,
    amount,
    currency,
    status: 'pending',
    reference,
    createdAt: new Date().toISOString(),
  };

  if (metadata) {
    paymentRecord.metadata = metadata;
  }

  if (orderId) {
    paymentRecord.orderId = orderId;
  }

  await db.collection('payments').add(paymentRecord);

  return { reference, merchantCode };
}
