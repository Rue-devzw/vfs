import { getDigitalProviderAdapter, DigitalProviderUnavailableError } from "@/lib/digital-providers";

export type DigitalServiceType = "ZESA" | "AIRTIME" | "DSTV" | "COUNCILS" | "NYARADZO" | "INTERNET";

export interface DigitalPurchasePayload {
  serviceType: DigitalServiceType;
  accountNumber: string;
  amount: number;
  paymentMethod: "WALLETPLUS" | "ECOCASH" | "INNBUCKS" | "OMARI" | "ONEMONEY" | "CARD";
  currencyCode?: "840" | "924";
  customerMobile?: string;
  email?: string;
  serviceMeta?: Record<string, string>;
}

export class DigitalServiceUnavailableError extends Error {
  readonly status: number;

  constructor(message: string, status = 501) {
    super(message);
    this.name = "DigitalServiceUnavailableError";
    this.status = status;
  }
}

function ensureAdapter(serviceType: DigitalServiceType) {
  const resolved = getDigitalProviderAdapter(serviceType.toLowerCase());
  if (!resolved) {
    throw new Error("Unsupported digital service.");
  }
  return resolved;
}

export const DigitalService = {
  validateAccount: async (serviceType: DigitalServiceType, accountNumber: string, serviceMeta?: Record<string, string>) => {
    if (!accountNumber) throw new Error("Account number is required.");
    const { config, adapter } = ensureAdapter(serviceType);

    try {
      return await adapter.validateAccount(config, accountNumber, serviceMeta);
    } catch (error) {
      if (error instanceof DigitalProviderUnavailableError) {
        throw new DigitalServiceUnavailableError(error.message, error.status);
      }
      throw error;
    }
  },

  initiatePurchase: async (payload: DigitalPurchasePayload, baseUrl: string) => {
    const { config, adapter } = ensureAdapter(payload.serviceType);

    try {
      return await adapter.initiatePurchase(config, payload, baseUrl);
    } catch (error) {
      if (error instanceof DigitalProviderUnavailableError) {
        throw new DigitalServiceUnavailableError(error.message, error.status);
      }
      throw error;
    }
  },

  vendDigitalFulfilment: async (serviceType: DigitalServiceType, input: {
    orderReference: string;
    accountNumber: string;
    amountUsd: number;
    serviceMeta?: Record<string, string>;
  }) => {
    const { config, adapter } = ensureAdapter(serviceType);
    if (!adapter.vend) {
      throw new DigitalServiceUnavailableError(`${config.label} fulfilment is not available yet.`);
    }

    try {
      return await adapter.vend(config, input);
    } catch (error) {
      if (error instanceof DigitalProviderUnavailableError) {
        throw new DigitalServiceUnavailableError(error.message, error.status);
      }
      throw error;
    }
  },

  vendZesaToken: async (orderReference: string, meterNumber: string, amount: number) => {
    return DigitalService.vendDigitalFulfilment("ZESA", {
      orderReference,
      accountNumber: meterNumber,
      amountUsd: amount,
    });
  },
};
