import { NextResponse } from "next/server";
import { z } from "zod";
import { DigitalService } from "@/lib/digital-service-logic";

const validateSchema = z.object({
    serviceType: z.enum(["ZESA", "AIRTIME", "DSTV", "COUNCILS", "NYARADZO", "INTERNET"]),
    accountNumber: z.string().min(1),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = validateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ success: false, error: validation.error.errors }, { status: 400 });
        }

        const { serviceType, accountNumber } = validation.data;
        const result = await DigitalService.validateAccount(serviceType, accountNumber);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Validation error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Validation failed" },
            { status: 500 }
        );
    }
}
