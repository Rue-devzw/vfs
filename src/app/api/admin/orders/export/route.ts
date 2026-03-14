import { NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/auth";
import { listOrders } from "@/lib/firestore/orders";

function csvEscape(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export async function GET() {
  try {
    await requireStaffPermission("orders.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await listOrders();
  const header = [
    "id",
    "orderNumber",
    "invoiceNumber",
    "customerName",
    "customerEmail",
    "customerPhone",
    "status",
    "paymentMethod",
    "subtotalUsd",
    "deliveryFeeUsd",
    "taxLabel",
    "taxRatePercent",
    "taxTotalUsd",
    "totalUsd",
    "total",
    "currencyCode",
    "createdAt",
  ];

  const rows = orders.map(order => [
    order.id,
    order.orderNumber ?? "",
    order.invoiceNumber ?? "",
    order.customerName,
    order.customerEmail,
    order.customerPhone ?? "",
    order.status,
    order.paymentMethod ?? "",
    order.subtotalUsd ?? "",
    order.deliveryFeeUsd ?? "",
    order.taxLabel ?? "",
    order.taxRatePercent ?? "",
    order.taxTotalUsd ?? "",
    order.totalUsd ?? "",
    order.total ?? "",
    order.currencyCode ?? "",
    order.createdAt ?? "",
  ]);

  const csv = [header, ...rows].map(row => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="orders-export.csv"',
    },
  });
}
