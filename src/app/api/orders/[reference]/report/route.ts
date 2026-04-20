import { NextResponse } from "next/server";
import { formatDocumentDateTime, getOrderDocumentState } from "@/lib/order-documents";
import type { Order, RefundCase } from "@/lib/firestore/orders";
import { getOrderTransactionReport } from "@/server/orders";
import { generateOrderPdf } from "@/lib/pdf-documents";

type RouteContext = {
  params: Promise<{ reference: string }>;
};

export async function GET(req: Request, context: RouteContext) {
  try {
    const { reference } = await context.params;
    const orderReference = decodeURIComponent(reference);
    const report = await getOrderTransactionReport(orderReference);
    if (!report) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }
    const typedOrder = report.order as Order;
    const typedRefunds = report.refunds as RefundCase[];

    const url = new URL(req.url);
    const format = url.searchParams.get("format");

    if (format === "pdf" || format === "invoice-pdf" || format === "report-pdf") {
      const documentState = getOrderDocumentState({
        order: typedOrder,
        refunds: typedRefunds,
      });
      if (format === "pdf" && documentState.kind !== "receipt") {
        return NextResponse.json(
          {
            success: false,
            error: documentState.kind === "report"
              ? "This order is not completed. Download the issue report instead."
              : "Receipt PDF becomes available once the order is completed. Use the invoice until then.",
          },
          { status: 409 },
        );
      }
      if (format === "report-pdf" && documentState.kind !== "report") {
        return NextResponse.json(
          { success: false, error: "Issue report PDF is only available for orders that need attention." },
          { status: 409 },
        );
      }

      const pdf = await generateOrderPdf({
        report,
        kind: format === "invoice-pdf" ? "invoice" : format === "report-pdf" ? "report" : "receipt",
      });

      return new NextResponse(pdf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${orderReference}-${format === "invoice-pdf" ? "invoice" : format === "report-pdf" ? "issue-report" : "receipt"}.pdf"`,
        },
      });
    }

    if (format === "txt" || format === "invoice") {
      const documentState = getOrderDocumentState({
        order: typedOrder,
        refunds: typedRefunds,
      });
      const order = typedOrder as unknown as Record<string, unknown>;
      const payload = [
        format === "invoice" ? `Invoice` : documentState.documentLabel,
        `Reference: ${orderReference}`,
        `Order Number: ${String(order.orderNumber ?? "")}`,
        `Invoice Number: ${String(order.invoiceNumber ?? "")}`,
        `Issued: ${formatDocumentDateTime(documentState.issuedAt ?? report.generatedAt)}`,
        `Status: ${documentState.statusLabel}`,
        `Currency: ${documentState.currencyLabel}`,
        ``,
        `Customer`,
        `Name: ${String(order.customerName ?? "")}`,
        `Email: ${String(order.customerEmail ?? "")}`,
        `Phone: ${String(order.customerPhone ?? "")}`,
        ``,
        `Totals`,
        `Subtotal: ${String(order.subtotalUsd ?? order.subtotal ?? "")}`,
        `Delivery Fee: ${String(order.deliveryFeeUsd ?? order.deliveryFee ?? "")}`,
        `${String(order.taxLabel ?? "Tax")}: ${String(order.taxTotalUsd ?? order.taxTotal ?? "")}`,
        `Grand Total: ${String(order.totalUsd ?? order.total ?? "")}`,
        ``,
        `Order`,
        JSON.stringify(report.order, null, 2),
        ``,
        `Payment Events`,
        JSON.stringify(report.events, null, 2),
        ``,
        `Refund Cases`,
        JSON.stringify(report.refunds, null, 2),
        ``,
        `Customer Engagement`,
        JSON.stringify(report.engagements, null, 2),
      ].join("\n");

      return new NextResponse(payload, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${orderReference}-${format === "invoice" ? "invoice" : "report"}.txt"`,
        },
      });
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Failed to generate order report:", error);
    return NextResponse.json({ success: false, error: "Unable to generate report." }, { status: 500 });
  }
}
