import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '../route';

const initiateMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/payments/ecocash', () => ({
  initiateEcocashPayment: initiateMock,
}));

describe('POST /api/payments/ecocash', () => {
  beforeEach(() => {
    initiateMock.mockReset();
  });

  it('returns a success response for a valid request', async () => {
    initiateMock.mockResolvedValue({ reference: 'ECO-REF', merchantCode: '123456' });

    const request = new Request('http://localhost/api/payments/ecocash', {
      method: 'POST',
      body: JSON.stringify({
        amount: 50,
        phoneNumber: '0772223333',
        currency: 'USD',
        metadata: { productId: 'prod_1' },
        orderId: 'order_456',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true, reference: 'ECO-REF', merchantCode: '123456' });
    expect(initiateMock).toHaveBeenCalledWith({
      amount: 50,
      phoneNumber: '0772223333',
      currency: 'USD',
      metadata: { productId: 'prod_1' },
      orderId: 'order_456',
    });
  });
});
