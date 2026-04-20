export type DigitalServiceId =
  | "zesa"
  | "airtime"
  | "dstv"
  | "councils"
  | "nyaradzo"
  | "internet";

export type DigitalServiceStatus = "active" | "coming_soon";
export type DigitalServiceField = {
  id: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number";
  required?: boolean;
  helpText?: string;
};

export type DigitalServiceConfig = {
  id: DigitalServiceId;
  label: string;
  description: string;
  accountLabel: string;
  provider: "smile-pay-utilities" | "smile-pay-egress" | "smile-pay-manual-bills" | "unavailable";
  status: DigitalServiceStatus;
  validationMode: "provider" | "manual" | "unsupported";
  purchaseMode: "provider" | "manual" | "unsupported";
  validationFallbackMode?: "manual";
  supportMessage?: string;
  formFields?: DigitalServiceField[];
};

export const DIGITAL_SERVICES: Record<DigitalServiceId, DigitalServiceConfig> = {
  zesa: {
    id: "zesa",
    label: "ZESA Tokens",
    description: "Buy prepaid electricity tokens instantly.",
    accountLabel: "Meter Number",
    provider: "smile-pay-egress",
    status: "active",
    validationMode: "provider",
    purchaseMode: "provider",
    supportMessage: "ZESA validation and token vending run through the EGRESS integration.",
  },
  airtime: {
    id: "airtime",
    label: "Airtime & Data",
    description: "Create a tracked airtime or data payment request and complete payment securely online.",
    accountLabel: "Phone Number",
    provider: "smile-pay-manual-bills",
    status: "active",
    validationMode: "manual",
    purchaseMode: "manual",
    supportMessage: "Payment is processed online and the airtime or data request is queued for fulfilment confirmation after payment succeeds.",
    formFields: [
      {
        id: "network",
        label: "Network",
        placeholder: "e.g. Econet, NetOne, Telecel",
        required: true,
      },
      {
        id: "productType",
        label: "Product Type",
        placeholder: "e.g. Airtime or Data",
        required: true,
      },
    ],
  },
  dstv: {
    id: "dstv",
    label: "DStv Payments",
    description: "Validate your smartcard and post your DStv payment through the EGRESS integration.",
    accountLabel: "Smartcard Number",
    provider: "smile-pay-egress",
    status: "active",
    validationMode: "provider",
    purchaseMode: "provider",
    validationFallbackMode: "manual",
    supportMessage: "DStv validation and payment posting run through the EGRESS integration, with manual fallback only if the provider fails.",
    formFields: [
      {
        id: "bouquet",
        label: "Bouquet",
        placeholder: "e.g. Compact Plus",
        required: true,
      },
      {
        id: "addons",
        label: "Add-ons",
        placeholder: "Optional add-ons separated by |",
        helpText: "Example: HDPVR|ASIAPK",
      },
    ],
  },
  councils: {
    id: "councils",
    label: "City of Harare",
    description: "Validate your City of Harare account and pay council bills securely online.",
    accountLabel: "Account Number",
    provider: "smile-pay-egress",
    status: "active",
    validationMode: "provider",
    purchaseMode: "provider",
    validationFallbackMode: "manual",
    supportMessage: "Council payments currently use the City of Harare EGRESS integration, with manual fallback only if the provider fails.",
  },
  nyaradzo: {
    id: "nyaradzo",
    label: "Nyaradzo Group",
    description: "Validate a policy and post Nyaradzo premium payments through the live EGRESS integration.",
    accountLabel: "Policy Number",
    provider: "smile-pay-egress",
    status: "active",
    validationMode: "provider",
    purchaseMode: "provider",
    validationFallbackMode: "manual",
    supportMessage: "Nyaradzo policy validation and payment posting run through the EGRESS integration, with manual fallback only if the provider fails.",
    formFields: [
      {
        id: "months",
        label: "Months to Pay",
        type: "number",
        required: true,
        placeholder: "e.g. 2",
      },
    ],
  },
  internet: {
    id: "internet",
    label: "Internet Providers",
    description: "Pay ISP bills online with tracked requests that are verified manually after payment confirmation.",
    accountLabel: "Account Number",
    provider: "smile-pay-manual-bills",
    status: "active",
    validationMode: "manual",
    purchaseMode: "manual",
    supportMessage: "Internet bill payments are accepted online and queued for manual fulfilment verification.",
  },
};

export const DIGITAL_SERVICE_LABELS: Record<DigitalServiceId, string> = Object.fromEntries(
  Object.values(DIGITAL_SERVICES).map(service => [service.id, service.label]),
) as Record<DigitalServiceId, string>;

export function isDigitalServiceId(value: string): value is DigitalServiceId {
  return value in DIGITAL_SERVICES;
}

export function getDigitalServiceConfig(value: string): DigitalServiceConfig | null {
  if (!isDigitalServiceId(value)) return null;
  return DIGITAL_SERVICES[value];
}
