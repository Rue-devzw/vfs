import { initiatePaynowPayment } from '@/lib/payments/paynow';

describe('initiatePaynowPayment', () => {
  it('should return a mock Paynow payment response', async () => {
    const payload = {
      amount: 100,
      phoneNumber: '1234567890',
    };

    const result = await initiatePaynowPayment(payload);

    expect(result.provider).toBe('paynow');
    expect(result.reference).toBeDefined();
    expect(result.merchantCode).toBeDefined();
  });
});
