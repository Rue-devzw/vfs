import { NextResponse } from "next/server";
import {
  markWebhookInboxStatus,
  recordWebhookInbox,
} from "@/lib/firestore/payments";
import { releaseExpiredReservations } from "@/lib/firestore/inventory";
import { getSmilePayWebhookSecret, verifySmilePayWebhookSignature } from "@/lib/payments/smile-pay";
import { persistSmilePayGatewayUpdate } from "@/lib/payments/smile-pay-service";

export async function POST(req: Request) {
  try {
    await releaseExpiredReservations();

    const webhookSecret = getSmilePayWebhookSecret();
    const secretHeader = req.headers.get("x-webhook-secret");
    const signature = req.headers.get("x-signature");
    let authenticated = false;

    if (webhookSecret) {
      if (secretHeader === webhookSecret) {
        authenticated = true;
      } else if (!signature) {
        return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
      }
    }

    const body = (await req.json()) as Record<string, unknown>;
    const rawStatus = typeof body.status === "string" ? body.status : "PENDING";
    const reference =
      typeof body.orderReference === "string"
        ? body.orderReference
        : typeof body.reference === "string"
          ? body.reference
          : "";

    if (!reference) {
      return NextResponse.json({ error: "Missing reference." }, { status: 400 });
    }

    if (signature) {
      if (!verifySmilePayWebhookSignature(body, signature)) {
        console.error("Invalid Smile Pay webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }

      authenticated = true;
    }

    if (!authenticated) {
      return NextResponse.json({ error: "Webhook authentication required." }, { status: 401 });
    }

    const inbox = await recordWebhookInbox("smile-pay", body, signature);
    if (inbox.alreadyProcessed) {
      return NextResponse.json({ received: true, deduplicated: true });
    }

    try {
      await persistSmilePayGatewayUpdate({
        reference,
        status: rawStatus,
        paymentMethod: typeof body.paymentOption === "string" ? body.paymentOption : "UNKNOWN",
        gatewayReference: typeof body.reference === "string" ? body.reference : undefined,
        responsePayload: body,
        meta: {
          paymentOption: body.paymentOption,
          amount: body.amount,
          currency: body.currency,
        },
      });
      await markWebhookInboxStatus(inbox.id, "processed");
    } catch (error) {
      await markWebhookInboxStatus(
        inbox.id,
        "failed",
        error instanceof Error ? error.message : "Webhook processing failed",
      );
      throw error;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Smile Pay webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook." },
      { status: 500 },
    );
  }
}
