#!/usr/bin/env python3

import csv
import json
import re
from pathlib import Path


ROOT = Path("/Users/Strive/Projects/vfs")
BASE_DIR = ROOT / "downloads" / "extracted-product-prices"
EXCEL_CSV = BASE_DIR / "grocery-stock-outline-prices.csv"
PDF_CSV = BASE_DIR / "fruit-veg-price-list.csv"
MERGED_CSV = BASE_DIR / "merged-normalized-price-list.csv"
MERGED_JSON = BASE_DIR / "merged-normalized-price-list.json"
MERGE_SUMMARY_JSON = BASE_DIR / "merged-normalized-price-list-summary.json"


def read_csv(path: Path):
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows, fieldnames):
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def as_float(value):
    if value in ("", None):
        return None
    return float(value)


def normalize_name(text: str) -> str:
    value = text.lower().strip()
    value = value.replace("&", " and ")
    value = re.sub(r"\bkgs\b", "kg", value)
    value = re.sub(r"\bltrs\b", "litres", value)
    value = re.sub(r"\bltr\b", "litre", value)
    value = re.sub(r"\bmls\b", "ml", value)
    value = re.sub(r"\bpnts\b", "pnt", value)
    value = re.sub(r"\bpunnets\b", "punnet", value)
    value = re.sub(r"\bbroccolli\b", "broccoli", value)
    value = re.sub(r"\bbuttenuts\b", "butternuts", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def canonical_description(descriptions):
    return sorted(descriptions, key=lambda item: (len(item), item.lower()))[0]


def merge_rows():
    excel_rows = read_csv(EXCEL_CSV)
    pdf_rows = read_csv(PDF_CSV)

    merged = {}

    for row in excel_rows:
        key = normalize_name(row["description"])
        entry = merged.setdefault(
            key,
            {
                "normalized_name": key,
                "description_candidates": set(),
                "category": row["category"] or None,
                "price_usd": None,
                "cash_price_usd": None,
                "online_price_usd": None,
                "pdf_price_usd": None,
                "excel_codes": set(),
                "pdf_codes": set(),
                "sources": set(),
            },
        )
        entry["description_candidates"].add(row["description"])
        entry["sources"].add("excel")
        if row["code"]:
            entry["excel_codes"].add(row["code"])
        cash_price = as_float(row["cash_price_usd"])
        online_price = as_float(row["online_price_usd"])
        if entry["cash_price_usd"] is None and cash_price is not None:
            entry["cash_price_usd"] = cash_price
        if entry["online_price_usd"] is None and online_price is not None:
            entry["online_price_usd"] = online_price
        if entry["category"] is None and row["category"]:
            entry["category"] = row["category"]

    for row in pdf_rows:
        key = normalize_name(row["description"])
        entry = merged.setdefault(
            key,
            {
                "normalized_name": key,
                "description_candidates": set(),
                "category": None,
                "price_usd": None,
                "cash_price_usd": None,
                "online_price_usd": None,
                "pdf_price_usd": None,
                "excel_codes": set(),
                "pdf_codes": set(),
                "sources": set(),
            },
        )
        entry["description_candidates"].add(row["description"])
        entry["sources"].add("pdf")
        if row["code"]:
            entry["pdf_codes"].add(row["code"])
        pdf_price = as_float(row["price_usd"])
        if entry["pdf_price_usd"] is None and pdf_price is not None:
            entry["pdf_price_usd"] = pdf_price

    normalized_rows = []
    for entry in merged.values():
        description = canonical_description(entry["description_candidates"])
        price_usd = (
            entry["online_price_usd"]
            if entry["online_price_usd"] not in (None, 0)
            else entry["pdf_price_usd"]
            if entry["pdf_price_usd"] not in (None, 0)
            else entry["cash_price_usd"]
        )

        normalized_rows.append(
            {
                "normalized_name": entry["normalized_name"],
                "description": description,
                "category": entry["category"],
                "price_usd": price_usd,
                "cash_price_usd": entry["cash_price_usd"],
                "online_price_usd": entry["online_price_usd"],
                "pdf_price_usd": entry["pdf_price_usd"],
                "excel_codes": "|".join(sorted(entry["excel_codes"])),
                "pdf_codes": "|".join(sorted(entry["pdf_codes"])),
                "sources": "|".join(sorted(entry["sources"])),
            }
        )

    normalized_rows.sort(key=lambda row: row["description"].lower())
    return excel_rows, pdf_rows, normalized_rows


def main():
    excel_rows, pdf_rows, normalized_rows = merge_rows()

    write_csv(
        MERGED_CSV,
        normalized_rows,
        [
            "normalized_name",
            "description",
            "category",
            "price_usd",
            "cash_price_usd",
            "online_price_usd",
            "pdf_price_usd",
            "excel_codes",
            "pdf_codes",
            "sources",
        ],
    )
    write_json(MERGED_JSON, normalized_rows)

    summary = {
        "excel_source_rows": len(excel_rows),
        "pdf_source_rows": len(pdf_rows),
        "merged_rows": len(normalized_rows),
        "overlap_rows": len(excel_rows) + len(pdf_rows) - len(normalized_rows),
        "merge_rule": {
            "key": "normalized description",
            "price_priority": ["online_price_usd", "pdf_price_usd", "cash_price_usd"],
        },
    }
    write_json(MERGE_SUMMARY_JSON, summary)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
