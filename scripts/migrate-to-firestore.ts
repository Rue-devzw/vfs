import { getDb } from "../src/lib/firebase-admin";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

async function migrate() {
    console.log("Starting migration to Firestore...");

    try {
        const db = getDb();
        const productsPath = path.join(process.cwd(), "public/data/products.json");

        if (!fs.existsSync(productsPath)) {
            console.error("Products file not found at:", productsPath);
            return;
        }

        const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
        console.log(`Found ${products.length} products to migrate.`);

        const batch = db.batch();
        const productsCol = db.collection("products");

        for (const product of products) {
            const docId = String(product.id);
            const docRef = productsCol.doc(docId);

            // Clean up product data for Firestore
            const { id, ...data } = product;

            batch.set(docRef, {
                ...data,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
            }, { merge: true });
        }

        await batch.commit();
        console.log("Migration completed successfully!");
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

migrate();
