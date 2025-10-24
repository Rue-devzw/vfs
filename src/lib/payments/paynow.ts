import { Paynow } from "paynow";

if (!process.env.PAYNOW_INTEGRATION_ID || !process.env.PAYNOW_INTEGRATION_KEY) {
  throw new Error("Paynow environment variables are not set.");
}

const paynow = new Paynow(process.env.PAYNOW_INTEGRATION_ID, process.env.PAYNOW_INTEGRATION_KEY);

paynow.resultUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/paynow/ipn`;
paynow.returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/store/paynow/return`;

export { paynow };