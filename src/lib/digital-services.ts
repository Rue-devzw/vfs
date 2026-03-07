export type DigitalServiceId =
  | "zesa"
  | "airtime"
  | "dstv"
  | "councils"
  | "nyaradzo"
  | "internet";

export const DIGITAL_SERVICE_LABELS: Record<DigitalServiceId, string> = {
  zesa: "ZESA Tokens",
  airtime: "Airtime & Data",
  dstv: "DStv Payments",
  councils: "City Councils",
  nyaradzo: "Nyaradzo Life",
  internet: "Internet Providers",
};

export function isDigitalServiceId(value: string): value is DigitalServiceId {
  return value in DIGITAL_SERVICE_LABELS;
}
