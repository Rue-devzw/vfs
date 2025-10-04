import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initiateEcocashPayment } from '@/lib/payments/ecocash';

const { addMock, collectionMock, getDbMock } = vi.hoisted(() => {
  const add = vi.fn();
  const collection = vi.fn(() => ({ add }));
  const getDb = vi.fn(() => ({ collection }));

  return { addMock: add, collectionMock: collection, getDbMock: getDb };
});

vi.mock('@/lib/firebase-admin', () => ({
  getDb: getDbMock,
}));

vi.mock('crypto', () => ({
  randomUUID: () => '12345678-1234-1234-1234-123456789012',
}));

describe('initiateEcocashPayment', () => {
  beforeEach(() => {
    addMock.mockReset();
    collectionMock.mockReset();
    getDbMock.mockReset();
    collectionMock.mockReturnValue({ add: addMock });
    getDbMock.mockReturnValue({ collection: collectionMock });
    process.env.ECOCASH_MERCHANT_CODE = '';
  });

  it('persists the payment and returns reference metadata', async () => {
    const payload = {
      amount: 25,
      phoneNumber: '0771234567',
      currency: 'USD',
      metadata: { orderType: 'subscription' },
      orderId: 'order_123',
    };

    const result = await initiateEcocashPayment(payload);

    expect(getDbMock).toHaveBeenCalledTimes(1);
    expect(collectionMock).toHaveBeenCalledWith('payments');
    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'ecocash',
        amount: payload.amount,
        currency: payload.currency,
        phoneNumber: payload.phoneNumber,
        reference: 'ECO-12345678',
        status: 'pending',
        metadata: payload.metadata,
        orderId: payload.orderId,
      }),
    );

    expect(result).toEqual({
      reference: 'ECO-12345678',
      merchantCode: '068951',
    });
  });

  it('uses the configured merchant code when provided', async () => {
    process.env.ECOCASH_MERCHANT_CODE = 'ABC123';

    const result = await initiateEcocashPayment({
      amount: 10,
      phoneNumber: '0711111111',
    });

    expect(result).toEqual({
      reference: 'ECO-12345678',
      merchantCode: 'ABC123',
    });
  });
});
