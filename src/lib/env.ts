import { z } from "zod";

const envSchema = z.object({
  // Firebase Public
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),

  // Firebase Admin
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),

  // Auth
  ADMIN_SESSION_PASSWORD: z.string().min(32),

  // ZB Payment Gateway
  ZB_API_KEY: z.string().min(1),
  ZB_API_SECRET: z.string().min(1),
  ZB_API_BASE_URL: z.string().url().optional(),
});

let parsedEnv;
try {
  parsedEnv = envSchema.parse({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    ADMIN_SESSION_PASSWORD: process.env.ADMIN_SESSION_PASSWORD,
    ZB_API_KEY: process.env.ZB_API_KEY,
    ZB_API_SECRET: process.env.ZB_API_SECRET,
    ZB_API_BASE_URL: process.env.ZB_API_BASE_URL,
  });
} catch (error) {
  console.error("❌ Environment variable validation failed:");
  if (error instanceof z.ZodError) {
    console.error(JSON.stringify(error.format(), null, 2));
  } else {
    console.error(error);
  }
  // In dev, we might want to continue with a partial env or dummy values to avoid crashing,
  // but for now, let's just let it throw or handle it gracefully.
  throw error;
}

console.log("✅ Environment variables validated successfully");

export const env = parsedEnv;
