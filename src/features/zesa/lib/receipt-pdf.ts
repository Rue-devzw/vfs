import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { formatMoney } from "@/lib/currency";
import { formatTokenGroups } from "@/lib/token-format";
import type { TokenResponse } from "../services/smile-pay-service";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 44;

type ReceiptLine = {
  label: string;
  value: string;
};

function drawText(page: PDFPage, text: string, x: number, y: number, options?: {
  font?: PDFFont;
  size?: number;
  color?: ReturnType<typeof rgb>;
}) {
  page.drawText(text, {
    x,
    y,
    font: options?.font,
    size: options?.size ?? 10,
    color: options?.color ?? rgb(0.12, 0.12, 0.12),
  });
}

function drawCenteredText(page: PDFPage, text: string, y: number, width: number, options: {
  font: PDFFont;
  size: number;
  color?: ReturnType<typeof rgb>;
  x?: number;
}) {
  const x = options.x ?? 0;
  const textWidth = options.font.widthOfTextAtSize(text, options.size);
  drawText(page, text, x + (width - textWidth) / 2, y, options);
}

function wrapText(text: string, maxChars = 34) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

async function blobToPngBytes(blob: Blob) {
  if (blob.type === "image/png") {
    return new Uint8Array(await blob.arrayBuffer());
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Unable to load image asset."));
      nextImage.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to prepare image asset.");
    }

    context.drawImage(image, 0, 0);

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!pngBlob) {
      throw new Error("Unable to encode image asset.");
    }

    return new Uint8Array(await pngBlob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadPublicImageAsPng(path: string) {
  const response = await fetch(path, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Unable to load image asset: ${path}`);
  }

  const blob = await response.blob();
  return blobToPngBytes(blob);
}

function buildReceiptRows(receipt: TokenResponse) {
  const tariffRate = typeof receipt.units === "number" && receipt.units > 0
    ? receipt.amount / receipt.units
    : null;

  return [
    tariffRate !== null && typeof receipt.units === "number"
      ? {
          label: `Tariff: ${receipt.units.toFixed(2)} kWh @ ${tariffRate.toFixed(2)} /kWh`,
          value: formatMoney(receipt.amount, receipt.currencyCode ?? "840"),
        }
      : null,
    typeof receipt.units === "number"
      ? {
          label: "Energy Bought (kWh)",
          value: receipt.units.toFixed(2),
        }
      : null,
    {
      label: "Tender Amount",
      value: formatMoney(receipt.amount, receipt.currencyCode ?? "840"),
    },
    {
      label: "Status",
      value: receipt.status,
    },
    receipt.transactionReference
      ? {
          label: "Gateway Ref",
          value: receipt.transactionReference,
        }
      : null,
    {
      label: "Issued On",
      value: new Intl.DateTimeFormat("en-ZW", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(receipt.date)),
    },
  ].filter((entry): entry is ReceiptLine => Boolean(entry));
}

export async function downloadZesaReceiptPdf(receipt: TokenResponse) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const width = page.getWidth();
  const height = page.getHeight();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const tokenFont = await pdf.embedFont(StandardFonts.CourierBold);

  const [vfsLogoBytes, zetdcLogoBytes] = await Promise.all([
    loadPublicImageAsPng("/images/logo.webp"),
    loadPublicImageAsPng("/images/zetdc-logo.png"),
  ]);

  const vfsLogo = await pdf.embedPng(vfsLogoBytes);
  const zetdcLogo = await pdf.embedPng(zetdcLogoBytes);

  const brandGreen = rgb(0.12, 0.42, 0.25);
  const brandOrange = rgb(0.91, 0.48, 0.17);
  const muted = rgb(0.42, 0.45, 0.48);
  const border = rgb(0.83, 0.86, 0.84);
  const softPanel = rgb(0.97, 0.98, 0.97);
  const tokenPanel = rgb(0.95, 0.98, 0.95);

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.995, 0.995, 0.99),
  });

  page.drawRectangle({
    x: 0,
    y: height - 126,
    width,
    height: 126,
    color: brandGreen,
  });

  page.drawRectangle({
    x: 0,
    y: height - 132,
    width,
    height: 6,
    color: brandOrange,
  });

  const watermarkDims = zetdcLogo.scale(0.86);
  page.drawImage(zetdcLogo, {
    x: (width - watermarkDims.width) / 2,
    y: 216,
    width: watermarkDims.width,
    height: watermarkDims.height,
    opacity: 0.1,
    rotate: degrees(-12),
  });

  page.drawRectangle({
    x: PAGE_MARGIN,
    y: height - 78,
    width: 34,
    height: 34,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.84, 0.9, 0.85),
    borderWidth: 1,
  });

  const vfsLogoDims = vfsLogo.scale(0.0195);
  page.drawImage(vfsLogo, {
    x: PAGE_MARGIN + (34 - vfsLogoDims.width) / 2,
    y: height - 78 + (34 - vfsLogoDims.height) / 2,
    width: vfsLogoDims.width,
    height: vfsLogoDims.height,
  });

  const headerTextX = PAGE_MARGIN + 46;

  drawText(page, "Valley Farm Secrets", headerTextX, height - 50, {
    font: bold,
    size: 18,
    color: rgb(1, 1, 1),
  });
  drawText(page, "Freshness • Quality • Convenience", headerTextX, height - 64, {
    font,
    size: 8.5,
    color: rgb(0.88, 0.94, 0.9),
  });
  drawText(page, "Digital Services Receipt", headerTextX, height - 76, {
    font,
    size: 7.5,
    color: rgb(0.82, 0.9, 0.84),
  });
  drawText(page, "ZESA Prepaid Token Receipt", PAGE_MARGIN, height - 120, {
    font: bold,
    size: 15,
    color: rgb(0.96, 0.83, 0.7),
  });

  const zetdcLogoDims = zetdcLogo.scale(0.19);
  page.drawImage(zetdcLogo, {
    x: width - PAGE_MARGIN - zetdcLogoDims.width,
    y: height - 90,
    width: zetdcLogoDims.width,
    height: zetdcLogoDims.height,
  });

  page.drawRectangle({
    x: PAGE_MARGIN,
    y: height - 278,
    width: width - PAGE_MARGIN * 2,
    height: 118,
    color: softPanel,
    borderColor: border,
    borderWidth: 1,
  });

  const metaLabelX = PAGE_MARGIN + 16;
  const metaValueX = PAGE_MARGIN + 190;
  let metaY = height - 188;

  const customerLines = receipt.customerName
    ? wrapText(receipt.customerName.toUpperCase(), 28)
    : [];

  const metaEntries = [
    ["Receipt no:", receipt.receiptNumber],
    ["Meter no:", receipt.meterNumber],
    ["Service:", "Electricity Pre-paid"],
  ] as const;

  for (const [label, value] of metaEntries) {
    drawText(page, label, metaLabelX, metaY, { font: bold, size: 11, color: muted });
    drawText(page, value, metaValueX, metaY, { font, size: 12 });
    metaY -= 22;
  }

  if (customerLines.length > 0) {
    drawText(page, "Customer Name:", metaLabelX, metaY, { font: bold, size: 11, color: muted });
    customerLines.forEach((line, index) => {
      drawText(page, line, metaValueX, metaY - index * 18, { font: bold, size: 12 });
    });
  }

  page.drawRectangle({
    x: PAGE_MARGIN,
    y: height - 490,
    width: width - PAGE_MARGIN * 2,
    height: 176,
    color: tokenPanel,
    borderColor: border,
    borderWidth: 1.2,
  });

  drawCenteredText(page, "ELECTRICITY TOKEN", height - 346, width - PAGE_MARGIN * 2, {
    x: PAGE_MARGIN,
    font: bold,
    size: 22,
    color: brandGreen,
  });
  drawCenteredText(page, "Enter this code into your meter:", height - 374, width - PAGE_MARGIN * 2, {
    x: PAGE_MARGIN,
    font: bold,
    size: 15,
    color: rgb(0.16, 0.16, 0.16),
  });

  const tokenLines = receipt.token ? formatTokenGroups(receipt.token).split("\n").filter(Boolean) : [];
  let tokenY = height - 414;
  tokenLines.forEach((tokenLine) => {
    drawCenteredText(page, tokenLine, tokenY, width - PAGE_MARGIN * 2, {
      x: PAGE_MARGIN,
      font: tokenFont,
      size: 23,
      color: rgb(0.1, 0.1, 0.1),
    });
    tokenY -= 28;
  });

  if (tokenLines.length === 0) {
    drawCenteredText(page, receipt.issue ? "MANUAL REVIEW" : receipt.status, height - 420, width - PAGE_MARGIN * 2, {
      x: PAGE_MARGIN,
      font: bold,
      size: 18,
      color: brandOrange,
    });
  }

  page.drawLine({
    start: { x: PAGE_MARGIN, y: height - 510 },
    end: { x: width - PAGE_MARGIN, y: height - 510 },
    thickness: 1,
    color: border,
  });

  const rows = buildReceiptRows(receipt);
  let rowY = height - 540;
  rows.forEach((row, index) => {
    drawText(page, row.label, PAGE_MARGIN + 6, rowY, {
      font,
      size: 11,
      color: muted,
    });

    const valueWidth = bold.widthOfTextAtSize(row.value, 11);
    drawText(page, row.value, width - PAGE_MARGIN - valueWidth - 8, rowY, {
      font: bold,
      size: 11,
      color: rgb(0.14, 0.14, 0.14),
    });

    if (index < rows.length - 1) {
      page.drawLine({
        start: { x: PAGE_MARGIN, y: rowY - 10 },
        end: { x: width - PAGE_MARGIN, y: rowY - 10 },
        thickness: 0.6,
        color: border,
      });
    }
    rowY -= 28;
  });

  page.drawRectangle({
    x: PAGE_MARGIN,
    y: 54,
    width: width - PAGE_MARGIN * 2,
    height: 74,
    color: rgb(0.965, 0.972, 0.968),
    borderColor: border,
    borderWidth: 1,
  });

  drawText(page, "Powered by Valley Farm Secrets", PAGE_MARGIN + 18, 103, {
    font: bold,
    size: 12,
    color: brandGreen,
  });
  drawText(page, "This receipt was generated from your successful digital electricity purchase.", PAGE_MARGIN + 18, 84, {
    font,
    size: 10,
    color: muted,
  });
  drawText(page, "Keep this receipt for your records and enter the token exactly as displayed above.", PAGE_MARGIN + 18, 68, {
    font,
    size: 10,
    color: muted,
  });

  const pdfBytes = await pdf.save();
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfBuffer).set(pdfBytes);
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `zesa-${receipt.receiptNumber}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
