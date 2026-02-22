/**
 * Migrates all local product images to Cloudinary and updates Firestore records.
 * Run with: npx tsx scripts/migrate-images-to-cloudinary.ts
 */

import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { v2 as cloudinary } from "cloudinary";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) config({ path: envPath });
else config();

import { getDb, isFirebaseConfigured } from "../src/lib/firebase-admin";

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
    console.error("❌  Missing CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET in .env.local");
    process.exit(1);
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

const IMAGES_DIR = path.resolve(process.cwd(), "public/images");

async function uploadToCloudinary(filePath: string, publicId: string): Promise<string> {
    const result = await cloudinary.uploader.upload(filePath, {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
        format: "webp",
    });
    return result.secure_url;
}

async function main() {
    if (!isFirebaseConfigured()) {
        console.error("❌  Firebase not configured. Check .env.local");
        process.exit(1);
    }

    if (!fs.existsSync(IMAGES_DIR)) {
        console.error("❌  /public/images directory not found");
        process.exit(1);
    }

    const db = getDb();

    // 1. Get all products that still have local image paths
    console.log("📋  Fetching all products from Firestore...");
    const snapshot = await db.collection("products").get();
    const localProducts = snapshot.docs.filter(doc => {
        const img: string = doc.data().image ?? "";
        return img.startsWith("/images/") || (!img.startsWith("http") && img !== "");
    });

    console.log(`🔍  Found ${localProducts.length} products with local image paths (out of ${snapshot.size} total)`);

    if (localProducts.length === 0) {
        console.log("✅  All products already have Cloudinary URLs. Nothing to migrate.");
        return;
    }

    // 2. Build a filename → file path map from /public/images
    const imageFiles = fs.readdirSync(IMAGES_DIR).filter(f => f.toLowerCase().endsWith(".webp"));
    const fileMap = new Map<string, string>(); // normalised name → full path
    for (const f of imageFiles) {
        const norm = f.toLowerCase().replace(/[\s\-&()]/g, "");
        fileMap.set(norm, path.join(IMAGES_DIR, f));
        fileMap.set(f.toLowerCase(), path.join(IMAGES_DIR, f)); // exact filename match too
    }

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const doc of localProducts) {
        const data = doc.data();
        const localPath: string = data.image ?? "";

        // Resolve to actual file on disk
        let filePath: string | undefined;

        if (localPath.startsWith("/images/")) {
            const fileName = localPath.replace("/images/", "");
            filePath = path.join(IMAGES_DIR, fileName);
            if (!fs.existsSync(filePath)) {
                // Try normalised match
                const norm = fileName.toLowerCase().replace(/[\s\-&()]/g, "");
                filePath = fileMap.get(norm);
            }
        }

        if (!filePath || !fs.existsSync(filePath)) {
            console.warn(`  ⚠️   [${doc.id}] ${data.name}: local file not found for "${localPath}" — skipping`);
            skipped++;
            continue;
        }

        try {
            const baseName = path.basename(filePath, ".webp").replace(/[^a-zA-Z0-9\-_]/g, "-");
            const publicId = `products/${baseName}`;
            const cloudinaryUrl = await uploadToCloudinary(filePath, publicId);

            await db.collection("products").doc(doc.id).update({
                image: cloudinaryUrl,
                updatedAt: new Date().toISOString(),
            });

            console.log(`  ✅  [${doc.id}] ${data.name} → ${cloudinaryUrl}`);
            uploaded++;
        } catch (err) {
            console.error(`  ❌  [${doc.id}] ${data.name}: upload failed —`, err);
            failed++;
        }
    }

    console.log(`\n🎉  Migration complete!`);
    console.log(`   Uploaded: ${uploaded}`);
    console.log(`   Skipped (file not found): ${skipped}`);
    console.log(`   Failed: ${failed}`);
}

main().catch(err => {
    console.error("❌  Migration failed:", err);
    process.exitCode = 1;
});
