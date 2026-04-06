export const PAYMENT_METHOD_VALUES = ["WALLETPLUS", "ECOCASH", "INNBUCKS", "OMARI", "ONEMONEY", "CARD"] as const;

export type PaymentMethod = typeof PAYMENT_METHOD_VALUES[number];

export const PAYMENT_METHOD_OPTIONS: Array<{ id: PaymentMethod; label: string }> = [
  { id: "WALLETPLUS", label: "SmileCash" },
  { id: "ECOCASH", label: "EcoCash" },
  { id: "INNBUCKS", label: "Innbucks" },
  { id: "OMARI", label: "Omari" },
  { id: "ONEMONEY", label: "OneMoney" },
  { id: "CARD", label: "Bank Card" },
];

export function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHOD_VALUES.includes(value as PaymentMethod);
}

export function getPaymentMethodLabel(method: PaymentMethod) {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.id === method)?.label ?? method;
}

export function requiresMobileNumber(method: PaymentMethod) {
  return method !== "CARD";
}

export function getPaymentMethodMobileHint(method: PaymentMethod) {
  return `Enter the mobile number associated with your ${getPaymentMethodLabel(method)} wallet.`;
}
