import { DSTV_ADD_ON_PACKAGES, DSTV_PRIMARY_PACKAGES } from "./dstv-packages";

export type DigitalServiceId =
  | "zesa"
  | "airtime"
  | "dstv"
  | "councils"
  | "nyaradzo"
  | "cimas"
  | "internet";

export type DigitalServiceStatus = "active" | "coming_soon";
export type DigitalServiceField = {
  id: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number";
  required?: boolean;
  helpText?: string;
  options?: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
};

export type DigitalServiceConfig = {
  id: DigitalServiceId;
  label: string;
  description: string;
  accountLabel: string;
  provider: "smile-pay-utilities" | "smile-pay-egress" | "unavailable";
  status: DigitalServiceStatus;
  validationMode: "provider" | "unsupported";
  purchaseMode: "provider" | "unsupported";
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
    description: "Airtime and data payments are currently unavailable online.",
    accountLabel: "Phone Number",
    provider: "unavailable",
    status: "coming_soon",
    validationMode: "unsupported",
    purchaseMode: "unsupported",
    supportMessage: "Airtime and data payments are temporarily unavailable.",
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
    supportMessage: "DStv validation and payment posting run through the EGRESS integration.",
    formFields: [
      {
        id: "paymentType",
        label: "Payment Type",
        required: true,
        placeholder: "Select payment type",
        options: [
          { label: "Bouquet Payment", value: "BOUQUET" },
          { label: "Top-Up Payment", value: "TOPUP" },
        ],
      },
      {
        id: "bouquet",
        label: "DSTV Package",
        placeholder: "Select bouquet package",
        options: DSTV_PRIMARY_PACKAGES.map((item) => ({
          label: `${item.displayName} (${item.code}) - ${item.currency} ${item.amount.toFixed(2)}`,
          value: item.code,
        })),
      },
      {
        id: "addon",
        label: "Add-On Package",
        placeholder: "Select add-on package",
        options: DSTV_ADD_ON_PACKAGES.map((item) => ({
          label: `${item.displayName} (${item.code}) - ${item.currency} ${item.amount.toFixed(2)}`,
          value: item.code,
        })),
      },
      {
        id: "months",
        label: "Number of Months",
        type: "number",
        placeholder: "e.g. 1",
        helpText: "Required for bouquet payments. Top-up payments use TOPUP as the provider detail.",
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
    supportMessage: "Council payments currently use the City of Harare EGRESS integration.",
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
  cimas: {
    id: "cimas",
    label: "CIMAS",
    description: "Validate a CIMAS member or payer account and post medical aid payments online.",
    accountLabel: "Reference Number",
    provider: "smile-pay-egress",
    status: "active",
    validationMode: "provider",
    purchaseMode: "provider",
    supportMessage: "CIMAS account validation and payment posting are temporarily unavailable.",
    formFields: [
      {
        id: "referenceType",
        label: "Reference Type",
        required: true,
        placeholder: "Select reference type",
        options: [
          { label: "Member", value: "M" },
          { label: "Payer", value: "E" },
        ],
      },
    ],
  },
  internet: {
    id: "internet",
    label: "Internet Providers",
    description: "Internet provider payments are currently unavailable online.",
    accountLabel: "Account Number",
    provider: "unavailable",
    status: "coming_soon",
    validationMode: "unsupported",
    purchaseMode: "unsupported",
    supportMessage: "Internet provider payments are temporarily unavailable.",
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
