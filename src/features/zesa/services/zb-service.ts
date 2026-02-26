
export interface CustomerDetails {
    meterNumber: string;
    name: string;
    address: string;
    balance: number;
}

export interface TokenResponse {
    token: string;
    units: number;
    amount: number;
    meterNumber: string;
    date: string;
    receiptNumber: string;
}

export interface PaymentInitResponse {
    redirectUrl: string;
}

// Mock database
const MOCK_CUSTOMERS: Record<string, CustomerDetails> = {
    "123456789": {
        meterNumber: "123456789",
        name: "John Doe",
        address: "123 Valley Road, Gweru",
        balance: -5.00, // Small debt
    },
    "987654321": {
        meterNumber: "987654321",
        name: "Jane Smith",
        address: "456 Farm Street, Harare",
        balance: 0,
    },
    "143098273": {
        meterNumber: "143098273",
        name: "Sarah Moyo",
        address: "78 Highlands, Harare",
        balance: 12.50,
    },
    "042873192": {
        meterNumber: "042873192",
        name: "Tinashe Gomo",
        address: "12 Mkoba 4, Gweru",
        balance: -2.00,
    },
};

export const ZBService = {
    validateMeter: async (meterNumber: string): Promise<CustomerDetails> => {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Strip spaces validation
        const cleanMeter = meterNumber.replace(/\s/g, "");
        const customer = MOCK_CUSTOMERS[cleanMeter];

        if (customer) {
            return customer;
        }

        throw new Error("Meter number not found. Please check and try again.");
    },

    purchaseToken: async (meterNumber: string, amount: number): Promise<PaymentInitResponse> => {
        if (amount < 2) {
            throw new Error("Minimum purchase amount is $2.00");
        }

        const res = await fetch("/api/zb/initiate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ meterNumber, amount })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to initiate ZB payment");
        }

        return { redirectUrl: data.redirectUrl };
    }
};
