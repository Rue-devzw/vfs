#!/usr/bin/env python3

import csv
import json
import re
from pathlib import Path

import openpyxl
from pypdf import PdfReader


ROOT = Path("/Users/Strive/Projects/vfs")
OUTPUT_DIR = ROOT / "downloads" / "extracted-product-prices"
XLSX_PATH = Path("/Users/Strive/Downloads/GROCERY STOCK OUTLINE 1.xlsx")
PDF_PATH = Path("/Users/Strive/Downloads/VFS (Fruit & Veg) - Price list (1).pdf")

PDF_LINE_RE = re.compile(r"^(?P<code>\S+)\s+(?P<description>.+?)\s+US\$(?P<price>\d+(?:\.\d+)?)\s*$")


def ensure_output_dir() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def clean_text(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def extract_excel_rows():
    workbook = openpyxl.load_workbook(XLSX_PATH, data_only=True)
    rows = []

    for sheet in workbook.worksheets:
        current_category = None
        has_prices = False

        for raw_row in sheet.iter_rows(values_only=True):
            code = clean_text(raw_row[0] if len(raw_row) > 0 else None)
            description = clean_text(raw_row[1] if len(raw_row) > 1 else None)
            cash_price = raw_row[3] if len(raw_row) > 3 else None
            online_price = raw_row[4] if len(raw_row) > 4 else None

            if code and code.startswith("Inventory Category"):
                current_category = code.replace("Inventory Category :", "").strip()
                continue

            if code == "Code" or not code or not description:
                continue

            cash_price = float(cash_price) if isinstance(cash_price, (int, float)) else None
            online_price = float(online_price) if isinstance(online_price, (int, float)) else None

            if cash_price is None and online_price is None:
                continue

            has_prices = True
            rows.append(
                {
                    "sheet": sheet.title,
                    "category": current_category,
                    "code": code,
                    "description": description,
                    "cash_price_usd": cash_price,
                    "online_price_usd": online_price,
                }
            )

        if not has_prices:
            continue

    return rows


def extract_pdf_rows():
    reader = PdfReader(str(PDF_PATH))
    rows = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            match = PDF_LINE_RE.match(line)
            if not match:
                continue

            rows.append(
                {
                    "page": page_number,
                    "code": match.group("code"),
                    "description": match.group("description"),
                    "price_usd": float(match.group("price")),
                }
            )

    return rows


def write_csv(path: Path, rows, fieldnames):
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main():
    ensure_output_dir()

    excel_rows = extract_excel_rows()
    pdf_rows = extract_pdf_rows()

    write_csv(
        OUTPUT_DIR / "grocery-stock-outline-prices.csv",
        excel_rows,
        ["sheet", "category", "code", "description", "cash_price_usd", "online_price_usd"],
    )
    write_json(OUTPUT_DIR / "grocery-stock-outline-prices.json", excel_rows)

    write_csv(
        OUTPUT_DIR / "fruit-veg-price-list.csv",
        pdf_rows,
        ["page", "code", "description", "price_usd"],
    )
    write_json(OUTPUT_DIR / "fruit-veg-price-list.json", pdf_rows)

    summary = {
        "excel_rows": len(excel_rows),
        "pdf_rows": len(pdf_rows),
        "output_dir": str(OUTPUT_DIR),
    }
    write_json(OUTPUT_DIR / "summary.json", summary)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
