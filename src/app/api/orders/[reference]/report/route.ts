import { NextResponse } from "next/server";
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

    const url = new URL(req.url);
    const format = url.searchParams.get("format");

    if (format === "pdf" || format === "invoice-pdf") {
      const pdf = await generateOrderPdf({
        report,
        kind: format === "invoice-pdf" ? "invoice" : "receipt",
      });

      return new NextResponse(pdf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${orderReference}-${format === "invoice-pdf" ? "invoice" : "receipt"}.pdf"`,
        },
      });
    }

    if (format === "txt" || format === "invoice") {
      const order = report.order as Record<string, unknown>;
      const payload = [
        format === "invoice" ? `Invoice` : `Transaction Report`,
        `Reference: ${orderReference}`,
        `Order Number: ${String(order.orderNumber ?? "")}`,
        `Invoice Number: ${String(order.invoiceNumber ?? "")}`,
        `Generated At: ${report.generatedAt}`,
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
