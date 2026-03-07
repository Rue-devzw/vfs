
export interface CustomerDetails {
    meterNumber: string;
    name?: string;
    address?: string;
    balance?: number;
}

export interface TokenResponse {
    token?: string;
    units?: number;
    amount: number;
    meterNumber: string;
    date: string;
    receiptNumber: string;
    status: string;
    transactionReference?: string;
    message?: string;
}

export interface PaymentInitResponse {
    reference: string;
    transactionReference: string;
    status: string;
    message?: string;
    paymentUrl?: string;
}

export interface PaymentStatusResponse {
    status: string;
    reference: string;
    paymentOption?: string;
}

export const ZBService = {
    validateMeter: async (meterNumber: string): Promise<CustomerDetails> => {
        const cleanMeter = meterNumber.replace(/\s/g, "");
        if (!/^\d{7,13}$/.test(cleanMeter)) {
            throw new Error("Please enter a valid meter number.");
        }

        return {
            meterNumber: cleanMeter,
            name: "Meter verified",
            address: "Will be confirmed on successful vend.",
            balance: 0,
        };
    },

    purchaseToken: async (
        meterNumber: string,
        amount: number,
        paymentMethod: string,
        customerMobile?: string
    ): Promise<PaymentInitResponse> => {
        if (amount < 2) {
            throw new Error("Minimum purchase amount is $2.00");
        }

        const res = await fetch("/api/digital/purchase", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                serviceType: "ZESA",
                accountNumber: meterNumber,
                amount,
                paymentMethod,
                customerMobile
            })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to initiate ZB payment");
        }

        return {
            reference: data.reference,
            transactionReference: data.transactionReference,
            status: data.status ?? "PENDING",
            message: data.message,
            paymentUrl: data.paymentUrl,
        };
    },

    confirmTokenPayment: async (
        reference: string,
        transactionReference: string,
        otp: string,
        paymentMethod: string
    ): Promise<PaymentStatusResponse> => {
        const res = await fetch("/api/zb/checkout/confirm", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ reference, transactionReference, otp, paymentMethod }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to confirm ZB payment");
        }

        return {
            status: data.status ?? "PENDING",
            reference: data.reference ?? reference,
        };
    },

    checkStatus: async (reference: string): Promise<PaymentStatusResponse> => {
        const res = await fetch(`/api/zb/status/${encodeURIComponent(reference)}`, {
            method: "GET",
            cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to check payment status");
        }
        return {
            status: data.data?.status ?? "PENDING",
            reference: data.data?.reference ?? reference,
            paymentOption: data.data?.paymentOption,
        };
    },
};
