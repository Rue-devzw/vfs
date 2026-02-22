import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db: FirebaseFirestore.Firestore | null = null;

export function isFirebaseConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PROJECT_ID !== 'your-project-id' &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY,
  );
}

export function getDb() {
  if (db) return db;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle various formats Vercel may store the key in:
  // 1. Literal \n sequences (most common)
  // 2. Actual newlines
  // 3. Surrounded by extra quotes
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    // Strip surrounding quotes if Vercel added them
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    // Convert literal \n to real newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase environment variables are not set');
  }

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });

  db = getFirestore(app);
  return db;
}
