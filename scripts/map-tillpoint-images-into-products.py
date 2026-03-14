#!/usr/bin/env python3

import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote


ROOT = Path("/Users/Strive/Projects/vfs")
PRODUCTS_PATH = ROOT / "public" / "data" / "products.json"
PLACEHOLDERS_PATH = ROOT / "src" / "lib" / "placeholder-images.json"
SOURCE_IMAGES_DIR = ROOT / "downloads" / "tillpoint-products" / "app-webp"
PUBLIC_IMAGES_DIR = ROOT / "public" / "images" / "tillpoint"
SUMMARY_PATH = ROOT / "downloads" / "extracted-product-prices" / "tillpoint-image-mapping-summary.json"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def slugify(value: str) -> str:
    value = re.sub(r"\(([^)]+)\)", lambda match: f" {match.group(1)} ", value)
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value)
    return value.strip("-")


def normalize_match_key(value: str) -> str:
    value = value.lower().replace("&", " and ")
    value = value.replace("pwdr", "powder").replace("pwd", "powder")
    value = value.replace("hds", "heads").replace("pnts", "punnet").replace("pnt", "punnet")
    value = value.replace("kgs", "kg").replace("ltrs", "litres").replace("ltr", "litre")
    value = re.sub(r"\b(\d+)l\b", r"\1 litre", value)
    value = re.sub(r"\b(\d+)mls\b", r"\1ml", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def strip_hash_suffix(filename_stem: str) -> str:
    return re.sub(r"-[a-f0-9]{12}$", "", filename_stem)


def build_image_lookup():
    lookup = {}
    for image_path in SOURCE_IMAGES_DIR.glob("*.webp"):
        base_slug = strip_hash_suffix(image_path.stem)
        lookup.setdefault(normalize_match_key(base_slug), image_path)
    return lookup


def public_url_for(image_name: str) -> str:
    return f"/images/tillpoint/{quote(image_name)}"


def main():
    PUBLIC_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    products = read_json(PRODUCTS_PATH)
    placeholders_doc = read_json(PLACEHOLDERS_PATH)
    placeholders = placeholders_doc["placeholderImages"]
    placeholder_by_id = {entry["id"]: entry for entry in placeholders}
    image_lookup = build_image_lookup()

    copied = set()
    matched = 0
    unmatched = 0

    for product in products:
        candidate_keys = []
        if product.get("image"):
            candidate_keys.append(normalize_match_key(product["image"]))
        candidate_keys.append(normalize_match_key(product["name"]))

        source_image = None
        for candidate_key in candidate_keys:
            if candidate_key in image_lookup:
                source_image = image_lookup[candidate_key]
                break

        if not source_image:
            unmatched += 1
            continue

        target_path = PUBLIC_IMAGES_DIR / source_image.name
        if source_image.name not in copied:
            shutil.copy2(source_image, target_path)
            copied.add(source_image.name)

        image_id = product.get("image") or slugify(product["name"])
        image_url = public_url_for(source_image.name)
        product["image"] = image_id

        placeholder_entry = {
            "id": image_id,
            "description": f"Image for {product['name']}",
            "imageUrl": image_url,
            "imageHint": product["name"],
        }
        placeholder_by_id[image_id] = placeholder_entry
        matched += 1

    placeholders_doc["placeholderImages"] = sorted(
        placeholder_by_id.values(),
        key=lambda entry: entry["id"],
    )

    write_json(PRODUCTS_PATH, products)
    write_json(PLACEHOLDERS_PATH, placeholders_doc)

    summary = {
        "products_total": len(products),
        "matched_products": matched,
        "unmatched_products": unmatched,
        "copied_images": len(copied),
        "public_images_dir": str(PUBLIC_IMAGES_DIR),
    }
    write_json(SUMMARY_PATH, summary)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
