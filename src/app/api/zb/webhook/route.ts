import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  mapGatewayStatusToPaymentIntent,
  markWebhookInboxStatus,
  recordWebhookInbox,
  upsertPaymentIntent,
} from "@/lib/firestore/payments";
import { releaseExpiredReservations } from "@/lib/firestore/inventory";
import { setOrderStatus } from "@/server/orders";

export async function POST(req: Request) {
  try {
    await releaseExpiredReservations();

    const webhookSecret = process.env.ZB_WEBHOOK_SECRET;
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

    const merchantSecret = process.env.ZB_API_SECRET;
    if (signature) {
      if (!merchantSecret) {
        return NextResponse.json({ error: "ZB_API_SECRET is required for signature validation." }, { status: 500 });
      }
      const payloadString = JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac("sha256", merchantSecret)
        .update(payloadString)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("Invalid ZB webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }

      authenticated = true;
    }

    if (!authenticated) {
      return NextResponse.json({ error: "Webhook authentication required." }, { status: 401 });
    }

    const inbox = await recordWebhookInbox("zb", body, signature);
    if (inbox.alreadyProcessed) {
      return NextResponse.json({ received: true, deduplicated: true });
    }

    try {
      await setOrderStatus(reference, rawStatus, {
        gatewayReference: typeof body.reference === "string" ? body.reference : undefined,
        paymentOption: body.paymentOption,
        amount: body.amount,
        currency: body.currency,
      });
      await upsertPaymentIntent({
        orderReference: reference,
        provider: "zb",
        paymentMethod: typeof body.paymentOption === "string" ? body.paymentOption : "UNKNOWN",
        gatewayReference: typeof body.reference === "string" ? body.reference : undefined,
        status: mapGatewayStatusToPaymentIntent(rawStatus),
        responsePayload: body,
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
    console.error("Error processing ZB webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook." },
      { status: 500 },
    );
  }
}
