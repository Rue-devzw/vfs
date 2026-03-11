import {
    initiateSmileCashExpress,
    initiateEcocashExpress,
    initiateInnbucksExpress,
    initiateOmariExpress,
    initiateZbStandardCheckout,
    type ZbCheckoutResponse,
    validateUtility,
    vendUtility,
} from "@/lib/payments/zb";
import { convertFromUsd, CurrencyCode, getZwgPerUsdRate } from "@/lib/currency";

export type DigitalServiceType = "ZESA" | "AIRTIME" | "DSTV" | "COUNCILS" | "NYARADZO" | "INTERNET";

export interface DigitalPurchasePayload {
    serviceType: "ZESA" | "AIRTIME" | "DSTV" | "COUNCILS" | "NYARADZO" | "INTERNET";
    accountNumber: string; // Meter number, Phone number, Smartcard, etc.
    amount: number;
    paymentMethod: "WALLETPLUS" | "ECOCASH" | "INNBUCKS" | "OMARI" | "CARD";
    currencyCode?: CurrencyCode;
    customerMobile?: string;
    email?: string;
}

export const DigitalService = {
    /**
     * Validates the account/meter number with the biller.
     * In production, this would call ZB's utility validation endpoints.
     */
    validateAccount: async (serviceType: DigitalServiceType, accountNumber: string) => {
        if (!accountNumber) throw new Error("Account number is required.");

        if (serviceType === "ZESA") {
            try {
                const result = await validateUtility({
                    billerCode: "ZESAPRE",
                    accountNumber,
                });
                return {
                    success: result.success,
                    accountName: result.accountName || "Verified Customer",
                    accountNumber: result.accountNumber || accountNumber,
                    billerName: "ZESA Prepaid",
                };
            } catch (error) {
                console.error("ZESA Verification Error:", error);
                // For development/demo, we might fallback to mock if API fails, 
                // but for "proper" flow we should throw.
                throw error;
            }
        }

        // Mock validation for other services for now
        return {
            success: true,
            accountName: "Verified Customer",
            accountNumber,
            billerName: serviceType,
        };
    },

    /**
     * Initiates a purchase for a digital service.
     */
    initiatePurchase: async (payload: DigitalPurchasePayload, baseUrl: string) => {
        const reference = `digi_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

        const currencyCode = payload.currencyCode ?? "840";
        const exchangeRate = getZwgPerUsdRate();
        const amount = convertFromUsd(payload.amount, currencyCode, exchangeRate);

        const zbPayload = {
            orderReference: reference,
            amount,
            returnUrl: `${baseUrl}/digital/success?ref=${reference}`,
            resultUrl: `${baseUrl}/api/zb/webhook`,
            itemName: `${payload.serviceType} Payment`,
            itemDescription: `${payload.serviceType} for ${payload.accountNumber}`,
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

    /**
     * Vends a ZESA token after successful payment.
     */
    vendZesaToken: async (orderReference: string, meterNumber: string, amount: number) => {
        try {
            const result = await vendUtility({
                billerCode: "ZESAPRE",
                accountNumber: meterNumber,
                amount,
                transactionReference: orderReference,
            });

            return {
                success: result.success,
                token: result.token,
                units: result.units,
                receiptNumber: result.receiptNumber,
                message: result.success ? "Token vended successfully" : (result.error || "Vending failed"),
            };
        } catch (error) {
            console.error("ZESA Vending Error:", error);
            throw error;
        }
    }
};
