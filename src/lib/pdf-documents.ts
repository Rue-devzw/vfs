import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getStoreSettings } from "./firestore/settings";

type TransactionReport = Awaited<ReturnType<typeof import("@/server/orders").getOrderTransactionReport>>;

type DrawTextOptions = {
  x?: number;
  size?: number;
  font?: PDFFont;
  color?: ReturnType<typeof rgb>;
};

function lineText(value: unknown) {
  return String(value ?? "");
}

function formatAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(2);
  }
  return lineText(value);
}

function wrapText(text: string, maxChars = 78) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

async function loadLogoPng() {
  try {
    const logoPath = path.resolve(process.cwd(), "public/images/logo.webp");
    const logoBuffer = await readFile(logoPath);
    return sharp(logoBuffer).png().toBuffer();
  } catch {
    return null;
  }
}

function drawText(page: PDFPage, text: string, y: number, options: DrawTextOptions) {
  page.drawText(text, {
    x: options.x ?? 52,
    y,
    size: options.size ?? 10,
    font: options.font,
    color: options.color ?? rgb(0.12, 0.12, 0.12),
  });
}

export async function generateOrderPdf(input: {
  report: NonNullable<TransactionReport>;
  kind: "receipt" | "invoice";
}) {
  const settings = await getStoreSettings();
  const order = input.report.order as Record<string, unknown>;
  const items = Array.isArray(order.items) ? (order.items as Array<Record<string, unknown>>) : [];

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logoPng = await loadLogoPng();
  const logoImage = logoPng ? await pdf.embedPng(logoPng) : null;

  let y = height - 48;
  const left = 52;
  const right = width - 52;
  const brandGreen = rgb(0.12, 0.42, 0.25);
  const muted = rgb(0.44, 0.46, 0.5);
  const border = rgb(0.87, 0.89, 0.9);
  const headerTextX = left;

  page.drawRectangle({
    x: 36,
    y: height - 126,
    width: width - 72,
    height: 90,
    color: rgb(0.96, 0.98, 0.96),
    borderColor: border,
    borderWidth: 1,
  });

  if (logoImage) {
    const watermarkDims = logoImage.scale(0.12);
    page.drawImage(logoImage, {
      x: (width - watermarkDims.width) / 2,
      y: (height - watermarkDims.height) / 2 - 18,
      width: watermarkDims.width,
      height: watermarkDims.height,
      opacity: 0.02,
    });

    const logoDims = logoImage.scale(0.03);
    page.drawImage(logoImage, {
      x: right - logoDims.width,
      y: height - 82,
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  drawText(page, settings.storeName, height - 62, {
    x: headerTextX,
    size: 18,
    font: bold,
    color: brandGreen,
  });
  drawText(page, input.kind === "invoice" ? "Invoice" : "Receipt", height - 84, {
    x: headerTextX,
    size: 12,
    font: bold,
    color: rgb(0.18, 0.18, 0.18),
  });
  drawText(page, settings.address, height - 100, {
    x: headerTextX,
    size: 9,
    font,
    color: muted,
  });
  drawText(page, `Support: ${settings.supportEmail} • ${settings.supportPhone}`, height - 114, {
    x: headerTextX,
    size: 9,
    font,
    color: muted,
  });

  y = height - 150;

  const metaEntries = [
    ["Reference", lineText(order.id ?? order.reference)],
    ["Order Number", lineText(order.orderNumber)],
    ["Invoice Number", lineText(order.invoiceNumber)],
    ["Issued", lineText(input.report.generatedAt)],
  ];

  page.drawRectangle({
    x: left,
    y: y - 78,
    width: right - left,
    height: 72,
    color: rgb(0.99, 0.99, 0.99),
    borderColor: border,
    borderWidth: 1,
  });

  let metaY = y - 18;
  for (const [label, value] of metaEntries) {
    drawText(page, `${label}:`, metaY, { x: left + 12, size: 9, font: bold, color: muted });
    drawText(page, value, metaY, { x: left + 118, size: 10, font, color: rgb(0.12, 0.12, 0.12) });
    metaY -= 16;
  }

  y -= 98;

  drawText(page, "Customer", y, { x: left, size: 11, font: bold, color: brandGreen });
  y -= 18;
  for (const line of [
    `Name: ${lineText(order.customerName)}`,
    `Email: ${lineText(order.customerEmail)}`,
    `Phone: ${lineText(order.customerPhone)}`,
    order.customerAddress ? `Address: ${lineText(order.customerAddress)}` : "",
  ].filter(Boolean)) {
    for (const wrapped of wrapText(line, 72)) {
      drawText(page, wrapped, y, { x: left, size: 10, font, color: rgb(0.12, 0.12, 0.12) });
      y -= 14;
    }
  }

  y -= 8;
  drawText(page, "Items", y, { x: left, size: 11, font: bold, color: brandGreen });
  y -= 18;

  const colProduct = left;
  const colQty = right - 190;
  const colUnit = right - 120;
  const colTotal = right - 48;

  page.drawLine({ start: { x: left, y: y + 10 }, end: { x: right, y: y + 10 }, thickness: 1, color: border });
  drawText(page, "Product", y, { x: colProduct, size: 9, font: bold, color: muted });
  drawText(page, "Qty", y, { x: colQty, size: 9, font: bold, color: muted });
  drawText(page, "Unit", y, { x: colUnit, size: 9, font: bold, color: muted });
  drawText(page, "Total", y, { x: colTotal, size: 9, font: bold, color: muted });
  y -= 14;
  page.drawLine({ start: { x: left, y: y + 6 }, end: { x: right, y: y + 6 }, thickness: 1, color: border });

  for (const item of items.slice(0, 16)) {
    const nameLines = wrapText(lineText(item.name), 34);
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.price ?? 0);
    const total = quantity * unitPrice;

    drawText(page, nameLines[0], y, { x: colProduct, size: 9, font });
    drawText(page, String(quantity), y, { x: colQty, size: 9, font });
    drawText(page, unitPrice.toFixed(2), y, { x: colUnit, size: 9, font });
    drawText(page, total.toFixed(2), y, { x: colTotal, size: 9, font: bold });
    y -= 13;

    for (const extraLine of nameLines.slice(1)) {
      drawText(page, extraLine, y, { x: colProduct, size: 9, font, color: muted });
      y -= 12;
    }

    page.drawLine({ start: { x: left, y: y + 4 }, end: { x: right, y: y + 4 }, thickness: 0.5, color: border });
    y -= 8;
  }

  if (items.length > 16) {
    drawText(page, `... ${items.length - 16} additional item(s) omitted from this summary`, y, {
      x: colProduct,
      size: 8,
      font,
      color: muted,
    });
    y -= 18;
  }

  const totalsTop = Math.max(y - 12, 140);
  page.drawRectangle({
    x: right - 220,
    y: totalsTop - 74,
    width: 220,
    height: 74,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: border,
    borderWidth: 1,
  });

  let totalsY = totalsTop - 16;
  const totals = [
    ["Subtotal", formatAmount(order.subtotalUsd ?? order.subtotal)],
    ["Delivery Fee", formatAmount(order.deliveryFeeUsd ?? order.deliveryFee)],
    [lineText(order.taxLabel ?? "Tax"), formatAmount(order.taxTotalUsd ?? order.taxTotal)],
    ["Grand Total", formatAmount(order.totalUsd ?? order.total)],
  ];

  for (const [label, value] of totals) {
    drawText(page, label, totalsY, { x: right - 204, size: 9, font: label === "Grand Total" ? bold : font, color: label === "Grand Total" ? brandGreen : muted });
    drawText(page, value, totalsY, { x: right - 86, size: 10, font: label === "Grand Total" ? bold : font, color: rgb(0.12, 0.12, 0.12) });
    totalsY -= 15;
  }

  const footerY = 76;
  page.drawLine({ start: { x: left, y: footerY + 26 }, end: { x: right, y: footerY + 26 }, thickness: 1, color: border });
  drawText(page, `Payment Method: ${lineText(order.paymentMethod)}`, footerY + 10, { x: left, size: 9, font, color: muted });
  drawText(page, `Status: ${lineText(order.status)} • Currency: ${lineText(order.currencyCode)}`, footerY - 4, { x: left, size: 9, font, color: muted });
  drawText(page, "This document was generated automatically by the Valley Farm Secrets commerce platform.", footerY - 24, {
    x: left,
    size: 8,
    font,
    color: muted,
  });

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}
