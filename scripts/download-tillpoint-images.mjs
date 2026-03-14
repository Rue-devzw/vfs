#!/usr/bin/env node

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const SUPABASE_URL = "https://ojyqiomlnbikncdpbvmh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeXFpb21sbmJpa25jZHBidm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTMxMjEsImV4cCI6MjA3OTkyOTEyMX0.qC7KvKMfmpDO1t0sGECVHJ6B90PmeDZ5AtzJTTqmq6o";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "downloads", "tillpoint-products");
const OUTPUT_IMAGES_DIR = path.join(OUTPUT_DIR, "images");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const DOWNLOAD_CONCURRENCY = 8;
const DOWNLOAD_TIMEOUT_MS = 20_000;
const EXISTING_SCAN_DIRS = [
  path.join(ROOT, "public", "images"),
  OUTPUT_IMAGES_DIR,
];
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
]);

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function slugify(value) {
  return String(value || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "product";
}

function extFromUrl(urlString) {
  try {
    const pathname = new URL(urlString).pathname;
    const ext = path.extname(pathname).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext) ? ext : "";
  } catch {
    return "";
  }
}

function extFromContentType(contentType) {
  const normalized = String(contentType || "").split(";")[0].trim().toLowerCase();
  switch (normalized) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/avif":
      return ".avif";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readManifest() {
  if (!(await exists(MANIFEST_PATH))) {
    return {
      generatedAt: null,
      source: "https://tillpoint.co.zw/",
      api: `${SUPABASE_URL}/rest/v1/products`,
      totals: {
        products: 0,
        sourceImages: 0,
        downloaded: 0,
        skippedByUrl: 0,
        skippedByHash: 0,
        failed: 0,
      },
      files: [],
    };
  }

  const content = await fs.readFile(MANIFEST_PATH, "utf8");
  const manifest = JSON.parse(content);
  const byUrl = new Map();

  for (const entry of manifest.files || []) {
    if (!entry?.imageUrl) continue;
    byUrl.set(entry.imageUrl, entry);
  }

  manifest.files = Array.from(byUrl.values());
  return manifest;
}

async function walk(dir) {
  if (!(await exists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }

    if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

async function buildExistingHashIndex() {
  const hashToPath = new Map();
  const files = new Set();

  for (const dir of EXISTING_SCAN_DIRS) {
    for (const filePath of await walk(dir)) {
      files.add(filePath);
    }
  }

  for (const filePath of files) {
    const buffer = await fs.readFile(filePath);
    hashToPath.set(sha256(buffer), filePath);
  }

  return hashToPath;
}

async function fetchProducts() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/products`);
  url.searchParams.set("select", "id,name,slug,thumbnail,images,is_available");
  url.searchParams.set("is_available", "eq.true");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "500");

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function collectImageJobs(products) {
  const jobs = [];
  const seen = new Set();

  for (const product of products) {
    const urls = [];
    if (product.thumbnail) urls.push(product.thumbnail);
    if (Array.isArray(product.images)) urls.push(...product.images);

    for (const imageUrl of urls) {
      if (!imageUrl || seen.has(imageUrl)) continue;
      seen.add(imageUrl);
      jobs.push({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug || slugify(product.name),
        imageUrl,
      });
    }
  }

  return jobs;
}

async function downloadImage(job, manifestUrlIndex, existingHashIndex) {
  const existingByUrl = manifestUrlIndex.get(job.imageUrl);
  if (existingByUrl) {
    return { status: "skippedByUrl", record: existingByUrl };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  const response = await fetch(job.imageUrl, { signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const hash = sha256(buffer);
  const duplicatePath = existingHashIndex.get(hash);

  if (duplicatePath) {
    const record = {
      productId: job.productId,
      productName: job.productName,
      productSlug: job.productSlug,
      imageUrl: job.imageUrl,
      status: "skippedByHash",
      hash,
      duplicateOf: path.relative(ROOT, duplicatePath),
      savedPath: null,
      size: buffer.length,
    };
    return { status: "skippedByHash", record };
  }

  const contentType = response.headers.get("content-type");
  const ext = extFromUrl(job.imageUrl) || extFromContentType(contentType) || ".jpg";
  const fileName = `${job.productSlug}-${hash.slice(0, 12)}${ext}`;
  const outputPath = path.join(OUTPUT_IMAGES_DIR, fileName);

  await fs.writeFile(outputPath, buffer);
  existingHashIndex.set(hash, outputPath);

  const record = {
    productId: job.productId,
    productName: job.productName,
    productSlug: job.productSlug,
    imageUrl: job.imageUrl,
    status: "downloaded",
    hash,
    duplicateOf: null,
    savedPath: path.relative(ROOT, outputPath),
    size: buffer.length,
  };

  return { status: "downloaded", record };
}

async function main() {
  await fs.mkdir(OUTPUT_IMAGES_DIR, { recursive: true });

  const manifest = await readManifest();
  const manifestUrlIndex = new Map(
    (manifest.files || []).map((entry) => [entry.imageUrl, entry]),
  );
  const existingHashIndex = await buildExistingHashIndex();
  const products = await fetchProducts();
  const jobs = collectImageJobs(products);

  let downloaded = 0;
  let skippedByUrl = 0;
  let skippedByHash = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= jobs.length) return;

      const job = jobs[index];

      try {
        const result = await downloadImage(job, manifestUrlIndex, existingHashIndex);
        manifestUrlIndex.set(job.imageUrl, result.record);

        if (result.status === "downloaded") downloaded += 1;
        if (result.status === "skippedByUrl") skippedByUrl += 1;
        if (result.status === "skippedByHash") skippedByHash += 1;
      } catch (error) {
        failed += 1;
        manifestUrlIndex.set(job.imageUrl, {
          productId: job.productId,
          productName: job.productName,
          productSlug: job.productSlug,
          imageUrl: job.imageUrl,
          status: "failed",
          hash: null,
          duplicateOf: null,
          savedPath: null,
          size: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, jobs.length) }, () => worker()),
  );

  manifest.generatedAt = new Date().toISOString();
  manifest.totals = {
    products: products.length,
    sourceImages: jobs.length,
    downloaded,
    skippedByUrl,
    skippedByHash,
    failed,
  };
  manifest.files = Array.from(manifestUrlIndex.values()).sort((a, b) =>
    String(a.imageUrl).localeCompare(String(b.imageUrl)),
  );

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        outputDir: path.relative(ROOT, OUTPUT_DIR),
        manifest: path.relative(ROOT, MANIFEST_PATH),
        totals: manifest.totals,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
