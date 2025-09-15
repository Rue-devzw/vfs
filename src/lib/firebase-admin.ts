import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db: FirebaseFirestore.Firestore | null = null;

export function getDb() {
  if (db) return db;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

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
