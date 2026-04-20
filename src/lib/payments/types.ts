export type CardPaymentDetails = {
  pan: string;
  expMonth: string;
  expYear: string;
  securityCode: string;
};

export type SmilePayCardAuthResponse = {
  authenticationStatus?: string;
  redirectHtml?: string;
};

export function normalizeCardPaymentDetails(details: CardPaymentDetails): CardPaymentDetails {
  const pan = details.pan.replace(/\D/g, "");
  const expMonthDigits = details.expMonth.replace(/\D/g, "");
  const expYearDigits = details.expYear.replace(/\D/g, "");
  const securityCode = details.securityCode.replace(/\D/g, "");

  return {
    pan,
    expMonth: expMonthDigits.padStart(2, "0").slice(-2),
    expYear: expYearDigits.length > 2 ? expYearDigits.slice(-2) : expYearDigits.padStart(2, "0"),
    securityCode,
  };
}
