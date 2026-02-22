import { Paynow } from "paynow";

if (!process.env.PAYNOW_INTEGRATION_ID || !process.env.PAYNOW_INTEGRATION_KEY) {
  throw new Error("Paynow environment variables are not set.");
}

const paynow = new Paynow(process.env.PAYNOW_INTEGRATION_ID, process.env.PAYNOW_INTEGRATION_KEY);

paynow.resultUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/paynow/ipn`;
paynow.returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/store/paynow/return`;

export { paynow };

export async function initiatePaynowPayment({
  amount,
  phoneNumber,
  metadata,
}: {
  amount: number;
  phoneNumber: string;
  metadata?: Record<string, string | number | boolean>;
}) {
  const payment = paynow.createPayment(
    String(metadata?.orderId || `ORDER-${Date.now()}`),
    String(metadata?.email || "customer@example.com")
  );

  payment.add("VFS Order", amount);

  const response = await paynow.sendMobile(payment, phoneNumber, 'ecocash');

  if (response.success) {
    return {
      success: true,
      provider: 'paynow',
      reference: response.pollUrl,
      instructions: response.instructions,
      merchantCode: process.env.PAYNOW_INTEGRATION_ID
    };
  } else {
    throw new Error(response.error || "Failed to initiate Paynow payment");
  }
}