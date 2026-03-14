#!/usr/bin/env python3

import csv
import json
import re
from pathlib import Path


ROOT = Path("/Users/Strive/Projects/vfs")
MERGED_CSV = ROOT / "downloads" / "extracted-product-prices" / "merged-normalized-price-list.csv"
CURRENT_PRODUCTS_JSON = ROOT / "public" / "data" / "products.json"
OUTPUT_JSON = ROOT / "public" / "data" / "products-import.json"
OUTPUT_SUMMARY_JSON = ROOT / "downloads" / "extracted-product-prices" / "products-import-summary.json"

EXCEL_CATEGORY_MAP = {
    "001 - BABY": ("Baby", "Baby"),
    "002 - BEVERAGES": ("Beverages", "Beverages"),
    "003 - CEREALS": ("Cereals", "Cereals"),
    "004 - CLEANING PRODUCTS": ("Cleaning Products", "Cleaning Products"),
    "005 - COSMETICS": ("Cosmetics", "Cosmetics"),
    "012 - SNACK": ("Grocery & Spices", "Snack"),
    "013 - SOUPS": ("Grocery & Spices", "Other Items"),
    "014 - SPICES": ("Grocery & Spices", "Spices"),
    "015 - SPREADS": ("Grocery & Spices", "Spreads"),
    "016 - STARCH": ("Grocery & Spices", "Starch"),
    "019 - TOILETRIES": ("Toiletries", "Toiletries"),
}

FRUIT_VEG_KEYWORDS = {
    "apple", "apples", "avocado", "banana", "bananas", "baobab", "beetroot", "brinjal",
    "broccoli", "butternut", "butternuts", "cabbage", "carrot", "carrots", "cauliflower",
    "covo", "cucumber", "egg plant", "grapes", "garlic", "gemsquash", "ginger", "lemon",
    "lettuce", "mushroom", "okra", "onion", "onions", "pears", "pepper", "pine apples",
    "pineapple", "potatoes", "potato", "raisins", "sweet potatoes", "tomatoes", "tomato",
    "green beans", "beans", "peas",
}

DRIED_KEYWORDS = {
    "brown rice", "rice", "millet", "rapoko", "sorghum", "samp", "wheat", "nyimo",
    "sugar beans", "roundnuts", "peanuts", "mixed grain", "madora",
}

SPICE_KEYWORDS = {
    "spice", "spices", "bbq", "vinegar", "sauce", "seeds",
}

SPREAD_KEYWORDS = {
    "peanut butter", "honey",
}


def read_csv(path: Path):
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def slugify(value: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", value.lower())).strip("-")


def parse_float(value):
    if value in ("", None):
        return None
    return float(value)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.lower()).strip()


def infer_unit(description: str) -> str:
    text = normalize_text(description)

    patterns = [
        (r"\b7\.5kg\b", "/7.5kg"),
        (r"\b15kg\b", "/15kg"),
        (r"\b5kg\b", "/5kg"),
        (r"\b3kg\b", "/3kg"),
        (r"\b2kg\b", "/2kg"),
        (r"\b1kg\b", "/1kg"),
        (r"\b750ml\b", "/750ml"),
        (r"\b500ml\b", "/500ml bottle"),
        (r"\b375ml\b", "/375ml"),
        (r"\b330ml\b", "/330ml"),
        (r"\b300ml\b", "/300ml"),
        (r"\b250ml\b", "/250ml"),
        (r"\b200ml\b", "/200ml carton"),
        (r"\b100ml\b", "/100ml bottle"),
        (r"\b2 litres\b|\b2l\b", "/2L"),
        (r"\b1 litre\b|\b1l\b", "/1L"),
        (r"\b500g\b", "/500g pack"),
        (r"\b200g\b", "/200g pack"),
        (r"\b100g\b", "/100g pack"),
        (r"\b75g\b", "/75g pack"),
        (r"\b60g\b", "/60g pack"),
        (r"\bkg\b", "/kg"),
        (r"\bbox\b", "/box"),
        (r"\bpocket\b|\bpoc\b", "/pocket"),
        (r"\btray\b|\btrays\b", "/tray"),
        (r"\bbunch\b|\bbunches\b|\bbun\b", "/bunch"),
        (r"\bpunnet\b|\bpnt\b", "/punnet"),
        (r"\bpack\b", "/pack"),
        (r"\bbottle\b", "/bottle"),
        (r"\bhead\b|\bheads\b", "/head"),
        (r"\beach\b", "/each"),
        (r"\bunit\b", "/unit"),
    ]

    for pattern, unit in patterns:
        if re.search(pattern, text):
            return unit

    return "/item"


def infer_category(description: str, category: str | None, sources: str):
    if category in EXCEL_CATEGORY_MAP:
        return EXCEL_CATEGORY_MAP[category]

    text = normalize_text(description)

    if any(keyword in text for keyword in FRUIT_VEG_KEYWORDS):
        return ("Fruit & Veg", None)
    if any(keyword in text for keyword in SPREAD_KEYWORDS):
        return ("Grocery & Spices", "Spreads")
    if any(keyword in text for keyword in SPICE_KEYWORDS):
        return ("Seasoning", "Seasoning")
    if any(keyword in text for keyword in DRIED_KEYWORDS):
        return ("Dried", "Dried")
    if "pdf" in sources:
        return ("Fruit & Veg", None)
    return ("Other Items", "Other Items")


def pick_sku(excel_codes: str, pdf_codes: str):
    if excel_codes:
        return excel_codes.split("|")[0]
    if pdf_codes:
        return pdf_codes.split("|")[0]
    return None


def main():
    merged_rows = read_csv(MERGED_CSV)
    current_products = read_json(CURRENT_PRODUCTS_JSON)
    max_existing_id = max(int(product["id"]) for product in current_products if str(product["id"]).isdigit())

    converted = []
    next_id = max_existing_id + 1

    for row in merged_rows:
        price = parse_float(row["price_usd"])
        if price is None:
            continue

        category, subcategory = infer_category(row["description"], row["category"] or None, row["sources"])
        sku = pick_sku(row["excel_codes"], row["pdf_codes"])
        image_slug = slugify(row["description"])

        converted.append(
            {
                "id": next_id,
                "name": row["description"],
                "sku": sku,
                "price": price,
                "unit": infer_unit(row["description"]),
                "category": category,
                "subcategory": subcategory,
                "image": image_slug,
                "onSpecial": False,
            }
        )
        next_id += 1

    write_json(OUTPUT_JSON, converted)

    summary = {
        "source_rows": len(merged_rows),
        "converted_rows": len(converted),
        "skipped_rows_without_price": len(merged_rows) - len(converted),
        "output_json": str(OUTPUT_JSON),
        "starting_id": max_existing_id + 1,
        "ending_id": next_id - 1,
    }
    write_json(OUTPUT_SUMMARY_JSON, summary)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
