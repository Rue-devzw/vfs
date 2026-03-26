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
  provider: "zb-egress" | "zb-manual-bills" | "unavailable";
  status: DigitalServiceStatus;
  validationMode: "provider" | "manual" | "unsupported";
  purchaseMode: "provider" | "manual" | "unsupported";
  supportMessage?: string;
  formFields?: DigitalServiceField[];
};

export const DIGITAL_SERVICES: Record<DigitalServiceId, DigitalServiceConfig> = {
  zesa: {
    id: "zesa",
    label: "ZESA Tokens",
    description: "Buy prepaid electricity tokens instantly.",
    accountLabel: "Meter Number",
    provider: "zb-egress",
    status: "active",
    validationMode: "provider",
    purchaseMode: "provider",
  },
  airtime: {
    id: "airtime",
    label: "Airtime & Data",
    description: "Create a tracked airtime or data payment request and complete payment securely online.",
    accountLabel: "Phone Number",
    provider: "zb-manual-bills",
    status: "active",
    validationMode: "manual",
    purchaseMode: "manual",
    supportMessage: "Payment is processed online and the airtime/data request is queued for manual fulfilment confirmation.",
  },
  dstv: {
    id: "dstv",
    label: "DStv Payments",
    description: "Validate your smartcard and post your DStv payment through the EGRESS integration.",
    accountLabel: "Smartcard Number",
    provider: "zb-egress",
    status: "active",
    validationMode: "provider",
    purchaseMode: "provider",
    supportMessage: "DStv validation and posting run through the EGRESS integration.",
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
    label: "City Councils",
    description: "Current provider-backed integration is available for City of Harare bill payments through EGRESS.",
    accountLabel: "Account Number",
    provider: "zb-egress",
    status: "active",
    validationMode: "provider",
    purchaseMode: "provider",
    supportMessage: "Council payments currently use the City of Harare EGRESS integration.",
  },
  nyaradzo: {
    id: "nyaradzo",
    label: "Nyaradzo Life",
    description: "Validate a policy and post premium payments through the EGRESS integration.",
    accountLabel: "Policy Number",
    provider: "zb-egress",
    status: "active",
    validationMode: "provider",
    purchaseMode: "provider",
    supportMessage: "Nyaradzo policy validation and payment posting run through the EGRESS integration.",
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
    provider: "zb-manual-bills",
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
