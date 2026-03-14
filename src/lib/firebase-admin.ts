import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth as getFirebaseAdminAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { type Bucket } from '@google-cloud/storage';

let db: FirebaseFirestore.Firestore | null = null;
let storageBucket: Bucket | null = null;

import { env } from '@/lib/env';

export function isFirebaseConfigured() {
  return Boolean(
    env.FIREBASE_PROJECT_ID &&
    env.FIREBASE_PROJECT_ID !== 'your-project-id' &&
    env.FIREBASE_CLIENT_EMAIL &&
    env.FIREBASE_PRIVATE_KEY,
  );
}

export function getDb() {
  if (db && storageBucket) return db;

  const projectId = env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  // Handle various formats Vercel may store the key in:
  // 1. Literal \n sequences (most common)
  // 2. Actual newlines
  // 3. Surrounded by extra quotes
  let privateKey = env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    // Strip surrounding quotes if Vercel added them
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    // Convert literal \n to real newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase environment variables are not set');
  }

  const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: storageBucketName,
    });

  db = getFirestore(app);
  storageBucket = getStorage(app).bucket();
  return db;
}

export function getStorageBucket() {
  if (!storageBucket) {
    getDb(); // Initializes both db and storageBucket
  }
  return storageBucket!;
}

export function getAdminAuth() {
  const projectId = env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  let privateKey = env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: storageBucketName,
    });

  return getFirebaseAdminAuth(app);
}
