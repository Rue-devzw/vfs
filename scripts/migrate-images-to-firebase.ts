import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

const envPath = process.env.DOTENV_CONFIG_PATH
    ? path.resolve(process.cwd(), process.env.DOTENV_CONFIG_PATH)
    : path.resolve(process.cwd(), ".env.local");

if (fs.existsSync(envPath)) {
    config({ path: envPath });
} else {
    config();
}

import { getDb, getStorageBucket, isFirebaseConfigured } from "../src/lib/firebase-admin";

async function migrateImages() {
    if (!isFirebaseConfigured()) {
        console.error("Firebase credentials are missing. Check your .env.local file.");
        process.exitCode = 1;
        return;
    }

    const db = getDb();
    const bucket = getStorageBucket();

    console.log("Fetching products from Firestore...");
    const productsSnapshot = await db.collection("products").get();

    const productsToUpdate = productsSnapshot.docs.filter(doc => {
        const data = doc.data();
        if (!data.image || typeof data.image !== 'string') return false;

        // Only migrate images that are stored locally.
        // They can be either relative (e.g. "/images/...") or absolute pointing to localhost Next.js (e.g. "http://localhost:3000/images/...")
        // But definitely not storage.googleapis.com
        if (data.image.includes('storage.googleapis.com') || data.image.includes('firebasestorage.googleapis.com')) {
            return false; // Already migrated Let it be
        }

        return data.image.includes('/images/');
    });

    console.log(`Found ${productsToUpdate.length} products to update out of ${productsSnapshot.size} total products.`);

    let successCount = 0;
    let failureCount = 0;

    for (const doc of productsToUpdate) {
        const data = doc.data();
        let localImagePath: string = data.image; // e.g. /images/Apples Assorted - Heads.webp or http://localhost:3000/images/...

        // Extract route path if it's a full localhost URL
        if (localImagePath.startsWith('http')) {
            try {
                const urlObj = new URL(localImagePath);
                localImagePath = urlObj.pathname; // Gets just the /images/... part
            } catch (e) {
                // Fallback
            }
        }

        // Construct local file path
        const absoluteLocalPath = path.join(process.cwd(), 'public', localImagePath);

        if (!fs.existsSync(absoluteLocalPath)) {
            console.warn(`[WARNING] File not found locally: ${absoluteLocalPath} for product ${doc.id} (${data.name})`);
            failureCount++;
            continue;
        }

        try {
            console.log(`Migrating image for product ${doc.id} (${data.name})...`);
            const buffer = fs.readFileSync(absoluteLocalPath);

            const filename = path.basename(localImagePath); // e.g. Apples Assorted - Heads.webp

            // We will sanitize the filename slightly or use it as is. 
            // The current admin upload route sanitizes: originalName.replace(/[^a-zA-Z0-9\-_]/g, '-')
            // But preserving the exact name is fine since it worked locally, maybe just replace spaces.
            const safeFilename = filename.replace(/\s+/g, '-');
            const firebasePath = `products/${safeFilename}`;

            const fileRef = bucket.file(firebasePath);

            // Upload
            await fileRef.save(buffer, {
                metadata: {
                    contentType: 'image/webp',
                },
                public: true, // Make file publicly readable
            });

            // Public URL format for Firebase Storage referencing Google Cloud Storage directly
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${firebasePath}`;

            // Update Firestore
            await doc.ref.update({
                image: publicUrl,
                updatedAt: new Date().toISOString()
            });

            console.log(`  -> Successfully updated to ${publicUrl}`);
            successCount++;
        } catch (err) {
            console.error(`  -> Failed to migrate ${localImagePath} for product ${doc.id}`, err);
            failureCount++;
        }
    }

    console.log('--- Migration Summary ---');
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed to migrate: ${failureCount}`);
    if (failureCount === 0) {
        console.log("🎉 All local images have been successfully migrated to Firebase Storage!");
    }
}

migrateImages().catch(error => {
    console.error("Migration failed due to an unexpected error:", error);
    process.exitCode = 1;
});
