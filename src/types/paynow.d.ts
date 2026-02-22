declare module 'paynow' {
    export class Payment {
        add(item: string, price: number): void;
    }

    export interface PaynowResponse {
        success: boolean;
        pollUrl?: string;
        redirectUrl?: string;
        instructions?: string;
        error?: string;
    }

    export class Paynow {
        constructor(integrationId: string, integrationKey: string);
        resultUrl: string;
        returnUrl: string;
        createPayment(reference: string, authEmail: string): Payment;
        send(payment: Payment): Promise<PaynowResponse>;
        sendMobile(payment: Payment, phone: string, method: string): Promise<PaynowResponse>;
    }
}
