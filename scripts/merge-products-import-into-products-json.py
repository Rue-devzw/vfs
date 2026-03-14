#!/usr/bin/env python3

import json
import re
from pathlib import Path


ROOT = Path("/Users/Strive/Projects/vfs")
CURRENT_PATH = ROOT / "public" / "data" / "products.json"
IMPORT_PATH = ROOT / "public" / "data" / "products-import.json"
BACKUP_PATH = ROOT / "public" / "data" / "products.before-merge.json"
SUMMARY_PATH = ROOT / "downloads" / "extracted-product-prices" / "products-json-merge-summary.json"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def is_placeholder_image(value: str | None) -> bool:
    if not value:
        return True
    lowered = value.lower()
    return lowered in {
        "product-apples",
        "placeholder",
        "/images/placeholder.webp",
    }


def main():
    current = read_json(CURRENT_PATH)
    incoming = read_json(IMPORT_PATH)

    write_json(BACKUP_PATH, current)

    by_sku = {}
    by_name = {}
    for product in current:
      sku = product.get("sku")
      if sku:
        by_sku[sku] = product
      by_name[norm(product["name"])] = product

    max_id = max(int(product["id"]) for product in current if str(product["id"]).isdigit())
    updated = 0
    added = 0

    for candidate in incoming:
        target = None
        sku = candidate.get("sku")
        if sku and sku in by_sku:
            target = by_sku[sku]
        elif norm(candidate["name"]) in by_name:
            target = by_name[norm(candidate["name"])]

        if target:
            target["name"] = candidate["name"]
            target["sku"] = candidate.get("sku")
            target["price"] = candidate["price"]
            target["unit"] = candidate["unit"]
            target["category"] = candidate["category"]
            target["subcategory"] = candidate.get("subcategory")
            if is_placeholder_image(target.get("image")):
                target["image"] = candidate["image"]
            target["onSpecial"] = target.get("onSpecial", False)
            if "oldPrice" in target and target["oldPrice"] in (None, 0, "", target["price"]):
                target.pop("oldPrice", None)
            updated += 1
            continue

        max_id += 1
        new_product = {
            "id": max_id,
            "name": candidate["name"],
            "sku": candidate.get("sku"),
            "price": candidate["price"],
            "unit": candidate["unit"],
            "category": candidate["category"],
            "subcategory": candidate.get("subcategory"),
            "image": candidate["image"],
            "onSpecial": False,
        }
        current.append(new_product)
        by_name[norm(new_product["name"])] = new_product
        if new_product.get("sku"):
            by_sku[new_product["sku"]] = new_product
        added += 1

    current.sort(key=lambda product: product["name"].lower())
    write_json(CURRENT_PATH, current)

    summary = {
        "original_count": len(read_json(BACKUP_PATH)),
        "import_count": len(incoming),
        "updated_existing": updated,
        "added_new": added,
        "final_count": len(current),
        "backup_path": str(BACKUP_PATH),
        "output_path": str(CURRENT_PATH),
    }
    write_json(SUMMARY_PATH, summary)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
