import { NextResponse } from "next/server";
import { z } from "zod";
import { DigitalService, DigitalServiceUnavailableError } from "@/lib/digital-service-logic";
import { getDigitalServiceConfig } from "@/lib/digital-services";
import {
    EgressGatewayError,
    isEgressServiceUnavailable,
} from "@/lib/payments/egress";
import { SmilePayGatewayError } from "@/lib/payments/smile-pay";

const validateSchema = z.object({
    serviceType: z.enum(["ZESA", "AIRTIME", "DSTV", "COUNCILS", "NYARADZO", "CIMAS", "INTERNET"]),
    accountNumber: z.string().min(1),
    serviceMeta: z.record(z.string()).optional(),
});

const REMOVED_SERVICE_TYPES = new Set(["COUNCILS", "INTERNET"]);

function digitalProviderUnavailableMessage(context: string) {
    return `${context} is temporarily unavailable because the provider gateway is not responding. Please try again shortly.`;
}

function providerValidationFailureMessage(serviceLabel: string) {
    if (/zesa|zetdc/i.test(serviceLabel)) {
        return "We could not validate that ZETDC meter number. Please check the digits on the meter or token slip and try again.";
    }

    return `${serviceLabel} validation could not be completed by the provider. Please check the details and try again.`;
}

export async function POST(req: Request) {
    let serviceLabel = "Digital service";

    try {
        const body = await req.json();
        const validation = validateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
        }

        const { serviceType, accountNumber, serviceMeta } = validation.data;
        if (REMOVED_SERVICE_TYPES.has(serviceType)) {
            return NextResponse.json(
                { success: false, error: "This digital payment service is not available." },
                { status: 404 },
            );
        }
        const serviceConfig = getDigitalServiceConfig(serviceType.toLowerCase());
        if (serviceConfig) {
            serviceLabel = serviceConfig.label;
        }
        const result = await DigitalService.validateAccount(serviceType, accountNumber, serviceMeta);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Validation error:", error);
        if (error instanceof DigitalServiceUnavailableError) {
            return NextResponse.json(
                { success: false, error: error.message, code: "SERVICE_UNAVAILABLE" },
                { status: error.status }
            );
        }
        if (error instanceof SmilePayGatewayError) {
            return NextResponse.json(
                {
                    success: false,
                    error: error.message,
                    code: "PROVIDER_VALIDATION_FAILED",
                    gatewayStatus: error.status,
                },
                { status: error.status >= 400 && error.status < 500 ? error.status : 502 }
            );
        }
        if (error instanceof EgressGatewayError) {
            if (isEgressServiceUnavailable(error)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: digitalProviderUnavailableMessage(`${serviceLabel} validation`),
                        code: "SERVICE_UNAVAILABLE",
                        gatewayStatus: error.status,
                    },
                    { status: 503 }
                );
            }
            return NextResponse.json(
                {
                    success: false,
                    error: providerValidationFailureMessage(serviceLabel),
                    code: "PROVIDER_VALIDATION_FAILED",
                    gatewayStatus: error.status,
                },
                { status: error.status >= 400 && error.status < 500 ? error.status : 502 }
            );
        }
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Validation failed" },
            { status: 500 }
        );
    }
}
