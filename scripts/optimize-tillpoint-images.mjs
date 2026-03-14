#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, "downloads", "tillpoint-products", "images");
const OUTPUT_DIR = path.join(ROOT, "downloads", "tillpoint-products", "app-webp");
const MANIFEST_PATH = path.join(ROOT, "downloads", "tillpoint-products", "app-manifest.json");

const MAX_WIDTH = 1280;
const MAX_HEIGHT = 1280;
const WEBP_QUALITY = 72;

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  if (!(await exists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function toRelative(targetPath) {
  return path.relative(ROOT, targetPath);
}

async function optimizeOne(sourcePath) {
  const fileName = `${path.basename(sourcePath, path.extname(sourcePath))}.webp`;
  const outputPath = path.join(OUTPUT_DIR, fileName);

  const sourceBuffer = await fs.readFile(sourcePath);
  const sourceSize = sourceBuffer.length;

  const transformer = sharp(sourceBuffer, { failOn: "none" }).rotate();
  const metadata = await transformer.metadata();

  await transformer
    .resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: WEBP_QUALITY,
      effort: 5,
    })
    .toFile(outputPath);

  const outputStats = await fs.stat(outputPath);
  const optimizedSize = outputStats.size;
  const savedBytes = Math.max(0, sourceSize - optimizedSize);
  const reductionPct = sourceSize > 0 ? Number(((savedBytes / sourceSize) * 100).toFixed(2)) : 0;

  return {
    sourcePath: toRelative(sourcePath),
    outputPath: toRelative(outputPath),
    sourceSize,
    optimizedSize,
    savedBytes,
    reductionPct,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    format: metadata.format ?? null,
  };
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const sourceFiles = await walk(INPUT_DIR);
  if (sourceFiles.length === 0) {
    throw new Error(`No source images found in ${toRelative(INPUT_DIR)}`);
  }

  const results = [];
  let totalSourceBytes = 0;
  let totalOptimizedBytes = 0;

  for (const sourcePath of sourceFiles) {
    const result = await optimizeOne(sourcePath);
    results.push(result);
    totalSourceBytes += result.sourceSize;
    totalOptimizedBytes += result.optimizedSize;
  }

  const totalSavedBytes = Math.max(0, totalSourceBytes - totalOptimizedBytes);
  const totalReductionPct =
    totalSourceBytes > 0 ? Number(((totalSavedBytes / totalSourceBytes) * 100).toFixed(2)) : 0;

  const manifest = {
    generatedAt: new Date().toISOString(),
    settings: {
      maxWidth: MAX_WIDTH,
      maxHeight: MAX_HEIGHT,
      format: "webp",
      quality: WEBP_QUALITY,
    },
    totals: {
      files: results.length,
      sourceBytes: totalSourceBytes,
      optimizedBytes: totalOptimizedBytes,
      savedBytes: totalSavedBytes,
      reductionPct: totalReductionPct,
    },
    files: results,
  };

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ outputDir: toRelative(OUTPUT_DIR), manifest: toRelative(MANIFEST_PATH), totals: manifest.totals }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
