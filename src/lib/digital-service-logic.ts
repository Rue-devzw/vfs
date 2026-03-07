import {
    initiateSmileCashExpress,
    initiateEcocashExpress,
    initiateInnbucksExpress,
    initiateOmariExpress,
    initiateZbStandardCheckout,
    type ZbCheckoutResponse,
} from "@/lib/payments/zb";

export type DigitalServiceType = "ZESA" | "AIRTIME" | "DSTV" | "COUNCILS" | "NYARADZO" | "INTERNET";

export interface DigitalPurchasePayload {
    serviceType: "ZESA" | "AIRTIME" | "DSTV" | "COUNCILS" | "NYARADZO" | "INTERNET";
    accountNumber: string; // Meter number, Phone number, Smartcard, etc.
    amount: number;
    paymentMethod: "WALLETPLUS" | "ECOCASH" | "INNBUCKS" | "OMARI" | "CARD";
    customerMobile?: string;
    email?: string;
}

export const DigitalService = {
    /**
     * Validates the account/meter number with the biller.
     * In production, this would call ZB's utility validation endpoints.
     */
    validateAccount: async (serviceType: DigitalServiceType, accountNumber: string) => {
        // Mock validation for now - in production this connects to ZB Bank Utility API
        if (!accountNumber) throw new Error("Account number is required.");

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

        const zbPayload = {
            orderReference: reference,
            amount: payload.amount,
            returnUrl: `${baseUrl}/digital/success?ref=${reference}`,
            resultUrl: `${baseUrl}/api/zb/webhook`,
            itemName: `${payload.serviceType} Payment`,
            itemDescription: `${payload.serviceType} for ${payload.accountNumber}`,
            currencyCode: "USD",
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
        };
    }
};
