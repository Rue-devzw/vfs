import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCustomerSession } from "@/lib/auth";
import { createCustomerRefundRequest, RefundRequestUnavailableError } from "@/server/orders";

const requestSchema = z.object({
  detail: z.string().trim().min(10).max(500),
});

type RouteContext = {
  params: Promise<{ reference: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const session = await verifyCustomerSession();
    if (!session?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { reference } = await context.params;
    const orderReference = decodeURIComponent(reference);
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors }, { status: 400 });
    }

    const result = await createCustomerRefundRequest({
      reference: orderReference,
      customerEmail: session.email,
      detail: parsed.data.detail,
    });

    return NextResponse.json({
      success: true,
      refundCaseId: result.refundCaseId,
      alreadyExists: result.alreadyExists,
      message: result.alreadyExists
        ? "A refund request is already active for this order."
        : "Refund request submitted successfully.",
    });
  } catch (error) {
    console.error("Failed to create refund request:", error);
    if (error instanceof RefundRequestUnavailableError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to submit refund request." },
      { status: 500 },
    );
  }
}
