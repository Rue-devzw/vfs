export type DigitalServiceId =
  | "zesa"
  | "airtime"
  | "dstv"
  | "councils"
  | "nyaradzo"
  | "internet";

export type DigitalServiceStatus = "active" | "coming_soon";

export type DigitalServiceConfig = {
  id: DigitalServiceId;
  label: string;
  description: string;
  accountLabel: string;
  provider: "zb-utility" | "unavailable";
  status: DigitalServiceStatus;
  validationMode: "provider" | "unsupported";
  purchaseMode: "provider" | "unsupported";
  supportMessage?: string;
};

export const DIGITAL_SERVICES: Record<DigitalServiceId, DigitalServiceConfig> = {
  zesa: {
    id: "zesa",
    label: "ZESA Tokens",
    description: "Buy prepaid electricity tokens instantly.",
    accountLabel: "Meter Number",
    provider: "zb-utility",
    status: "active",
    validationMode: "provider",
    purchaseMode: "provider",
  },
  airtime: {
    id: "airtime",
    label: "Airtime & Data",
    description: "Mobile top-ups are not yet live on the production gateway.",
    accountLabel: "Phone Number",
    provider: "unavailable",
    status: "coming_soon",
    validationMode: "unsupported",
    purchaseMode: "unsupported",
    supportMessage: "Airtime and data purchases are not enabled on the live provider integration yet.",
  },
  dstv: {
    id: "dstv",
    label: "DStv Payments",
    description: "DStv subscription payments will be enabled once provider validation is integrated.",
    accountLabel: "Smartcard Number",
    provider: "unavailable",
    status: "coming_soon",
    validationMode: "unsupported",
    purchaseMode: "unsupported",
    supportMessage: "DStv account validation is not connected to a live provider yet.",
  },
  councils: {
    id: "councils",
    label: "City Councils",
    description: "Municipal bill payments require provider-specific billing integrations before go-live.",
    accountLabel: "Account Number",
    provider: "unavailable",
    status: "coming_soon",
    validationMode: "unsupported",
    purchaseMode: "unsupported",
    supportMessage: "Council bill payments are not yet connected to a live billing provider.",
  },
  nyaradzo: {
    id: "nyaradzo",
    label: "Nyaradzo Life",
    description: "Policy premium collection is awaiting verified provider integration.",
    accountLabel: "Policy Number",
    provider: "unavailable",
    status: "coming_soon",
    validationMode: "unsupported",
    purchaseMode: "unsupported",
    supportMessage: "Nyaradzo policy payments are not available until provider verification is implemented.",
  },
  internet: {
    id: "internet",
    label: "Internet Providers",
    description: "ISP bill payments are not yet linked to a live provider adapter.",
    accountLabel: "Account Number",
    provider: "unavailable",
    status: "coming_soon",
    validationMode: "unsupported",
    purchaseMode: "unsupported",
    supportMessage: "Internet provider payments are not enabled in production yet.",
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
