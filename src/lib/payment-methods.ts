export const PAYMENT_METHOD_VALUES = ["WALLETPLUS", "ECOCASH", "INNBUCKS", "OMARI", "ONEMONEY", "CARD"] as const;

export type PaymentMethod = typeof PAYMENT_METHOD_VALUES[number];

export type PaymentMethodOption = { id: PaymentMethod; label: string };

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
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

function normalizeConfiguredPaymentMethod(value: string) {
  const normalized = value.trim().toUpperCase();

  if (
    normalized === "VISA/MASTERCARD"
    || normalized === "VISA"
    || normalized === "MASTERCARD"
    || normalized === "BANKCARD"
    || normalized === "BANK_CARD"
  ) {
    return "CARD";
  }

  return normalized;
}

function parseConfiguredPaymentMethods(rawValue = process.env.NEXT_PUBLIC_SMILE_PAY_ENABLED_METHODS) {
  if (!rawValue) {
    return PAYMENT_METHOD_OPTIONS;
  }

  const configuredIds = rawValue
    .split(",")
    .map(normalizeConfiguredPaymentMethod)
    .filter(isPaymentMethod);

  if (configuredIds.length === 0) {
    return PAYMENT_METHOD_OPTIONS;
  }

  const configuredSet = new Set(configuredIds);
  return PAYMENT_METHOD_OPTIONS.filter(option => configuredSet.has(option.id));
}

export function getEnabledPaymentMethodOptions() {
  return parseConfiguredPaymentMethods();
}

export function getEnabledPaymentMethods() {
  return getEnabledPaymentMethodOptions().map(option => option.id);
}

export function getDefaultPaymentMethod(): PaymentMethod {
  return getEnabledPaymentMethods()[0] ?? "WALLETPLUS";
}

export function isPaymentMethodEnabled(method: PaymentMethod) {
  return getEnabledPaymentMethods().includes(method);
}

export function requiresMobileNumber(method: PaymentMethod) {
  return method !== "CARD";
}

export function getPaymentMethodMobileHint(method: PaymentMethod) {
  return `Enter the mobile number associated with your ${getPaymentMethodLabel(method)} wallet.`;
}
