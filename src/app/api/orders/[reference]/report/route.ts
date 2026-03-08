import { NextResponse } from "next/server";
import { getOrderTransactionReport } from "@/server/orders";

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

    if (format === "txt") {
      const payload = [
        `Transaction Report`,
        `Reference: ${orderReference}`,
        `Generated At: ${report.generatedAt}`,
        ``,
        `Order`,
        JSON.stringify(report.order, null, 2),
        ``,
        `Payment Events`,
        JSON.stringify(report.events, null, 2),
      ].join("\n");

      return new NextResponse(payload, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${orderReference}-report.txt"`,
        },
      });
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Failed to generate order report:", error);
    return NextResponse.json({ success: false, error: "Unable to generate report." }, { status: 500 });
  }
}

