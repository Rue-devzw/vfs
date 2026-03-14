import {
  initiateEcocashExpress,
  initiateInnbucksExpress,
  initiateOmariExpress,
  initiateSmileCashExpress,
  initiateZbStandardCheckout,
  type ZbCheckoutResponse,
  validateUtility,
  vendUtility,
} from "@/lib/payments/zb";
import { convertFromUsd, type CurrencyCode, getZwgPerUsdRate } from "@/lib/currency";
import {
  DIGITAL_SERVICES,
  getDigitalServiceConfig,
  type DigitalServiceConfig,
  type DigitalServiceId,
} from "@/lib/digital-services";

export type ProviderValidationResult = {
  success: boolean;
  accountName?: string;
  accountNumber: string;
  billerName?: string;
  raw?: Record<string, unknown>;
};

export type ProviderPurchasePayload = {
  serviceType: Uppercase<DigitalServiceId>;
  accountNumber: string;
  amount: number;
  paymentMethod: "WALLETPLUS" | "ECOCASH" | "INNBUCKS" | "OMARI" | "CARD";
  currencyCode?: CurrencyCode;
  customerMobile?: string;
  email?: string;
};

export type ProviderPurchaseResult = {
  reference: string;
  transactionReference?: string;
  status: string;
  paymentUrl?: string;
  message?: string;
  amount: number;
  currencyCode: CurrencyCode;
  exchangeRate: number;
  amountUsd: number;
};

export type ProviderVendResult = {
  success: boolean;
  token?: string;
  units?: number;
  receiptNumber?: string;
  message?: string;
  raw?: Record<string, unknown>;
};

export class DigitalProviderUnavailableError extends Error {
  readonly status: number;

  constructor(message: string, status = 501) {
    super(message);
    this.name = "DigitalProviderUnavailableError";
    this.status = status;
  }
}

export type DigitalProviderAdapter = {
  id: string;
  supports: DigitalServiceId[];
  validateAccount: (config: DigitalServiceConfig, accountNumber: string) => Promise<ProviderValidationResult>;
  initiatePurchase: (config: DigitalServiceConfig, payload: ProviderPurchasePayload, baseUrl: string) => Promise<ProviderPurchaseResult>;
  vend?: (config: DigitalServiceConfig, input: { orderReference: string; accountNumber: string; amountUsd: number }) => Promise<ProviderVendResult>;
};

function buildReference(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

const unavailableAdapter: DigitalProviderAdapter = {
  id: "unavailable",
  supports: Object.keys(DIGITAL_SERVICES).filter(key => key !== "zesa") as DigitalServiceId[],
  async validateAccount(config) {
    throw new DigitalProviderUnavailableError(
      config.supportMessage || `${config.label} validation is not available yet.`,
    );
  },
  async initiatePurchase(config) {
    throw new DigitalProviderUnavailableError(
      config.supportMessage || `${config.label} payments are not available yet.`,
    );
  },
};

const zbUtilityAdapter: DigitalProviderAdapter = {
  id: "zb-utility",
  supports: ["zesa"],
  async validateAccount(config, accountNumber) {
    if (config.id !== "zesa") {
      throw new DigitalProviderUnavailableError(`${config.label} validation is not implemented.`);
    }

    const result = await validateUtility({
      billerCode: "ZESAPRE",
      accountNumber,
    });

    return {
      success: result.success,
      accountName: result.accountName || "Verified Customer",
      accountNumber: result.accountNumber || accountNumber,
      billerName: "ZESA Prepaid",
      raw: result as Record<string, unknown>,
    };
  },
  async initiatePurchase(config, payload, baseUrl) {
    const reference = buildReference("digi");
    const currencyCode = payload.currencyCode ?? "840";
    const exchangeRate = getZwgPerUsdRate();
    const amount = convertFromUsd(payload.amount, currencyCode, exchangeRate);

    const zbPayload = {
      orderReference: reference,
      amount,
      returnUrl: `${baseUrl}/digital/success?ref=${reference}`,
      resultUrl: `${baseUrl}/api/zb/webhook`,
      itemName: `${config.label} Payment`,
      itemDescription: `${config.label} for ${payload.accountNumber}`,
      currencyCode,
      email: payload.email,
    };

    let response: ZbCheckoutResponse;
    if (payload.paymentMethod === "CARD") {
      response = await initiateZbStandardCheckout({ ...zbPayload, paymentMethod: "CARD" });
    } else {
      if (!payload.customerMobile) throw new Error("Mobile number required for express checkout.");
      const expressPayload = { ...zbPayload, customerMobile: payload.customerMobile };

      switch (payload.paymentMethod) {
        case "ECOCASH": response = await initiateEcocashExpress(expressPayload); break;
        case "INNBUCKS": response = await initiateInnbucksExpress(expressPayload); break;
        case "OMARI": response = await initiateOmariExpress(expressPayload); break;
        case "WALLETPLUS": response = await initiateSmileCashExpress(expressPayload); break;
        default: throw new Error("Unsupported payment method");
      }
    }

    return {
      reference,
      transactionReference: response.transactionReference,
      status: response.status ?? "PENDING",
      paymentUrl: response.paymentUrl,
      message: response.responseMessage,
      amount,
      currencyCode,
      exchangeRate,
      amountUsd: payload.amount,
    };
  },
  async vend(config, input) {
    if (config.id !== "zesa") {
      throw new DigitalProviderUnavailableError(`${config.label} vending is not implemented.`);
    }

    const result = await vendUtility({
      billerCode: "ZESAPRE",
      accountNumber: input.accountNumber,
      amount: input.amountUsd,
      transactionReference: input.orderReference,
    });

    return {
      success: result.success,
      token: result.token,
      units: result.units,
      receiptNumber: result.receiptNumber,
      message: result.success ? "Token vended successfully" : (result.error || "Vending failed"),
      raw: result as Record<string, unknown>,
    };
  },
};

const ADAPTERS: Record<string, DigitalProviderAdapter> = {
  "unavailable": unavailableAdapter,
  "zb-utility": zbUtilityAdapter,
};

export function getDigitalProviderAdapter(serviceType: string) {
  const config = getDigitalServiceConfig(serviceType.toLowerCase());
  if (!config) return null;
  const adapter = ADAPTERS[config.provider];
  if (!adapter) return null;
  return { config, adapter };
}
