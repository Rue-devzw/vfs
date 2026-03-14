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
  ADMIN_PASSWORD: z.string().min(1).optional(),
  STORE_MANAGER_PASSWORD: z.string().min(1).optional(),
  AUDITOR_PASSWORD: z.string().min(1).optional(),

  // ZB Payment Gateway
  ZB_API_KEY: z.string().min(1),
  ZB_API_SECRET: z.string().min(1),
  ZB_API_BASE_URL: z.string().url().optional(),
  ZB_UTILITIES_BASE_URL: z.string().url().optional(),
  ZB_WEBHOOK_SECRET: z.string().min(1).optional(),

  // SMTP notifications
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().min(1).optional(),

  // Edge protection
  RATE_LIMIT_CHECKOUT_PER_MINUTE: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_ACCOUNT_LOGIN_PER_MINUTE: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_ACCOUNT_REGISTER_PER_MINUTE: z.coerce.number().int().positive().optional(),
});

const skipValidation = process.env.SKIP_ENV_VALIDATION === "true";

let parsedEnv;

if (skipValidation) {
  console.warn("⚠️ Skipping environment variable validation (SKIP_ENV_VALIDATION=true)");
  // Use partially parsed or raw env to avoid crashing during build
  parsedEnv = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "",
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "",
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || "",
    ADMIN_SESSION_PASSWORD: process.env.ADMIN_SESSION_PASSWORD || "",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    STORE_MANAGER_PASSWORD: process.env.STORE_MANAGER_PASSWORD,
    AUDITOR_PASSWORD: process.env.AUDITOR_PASSWORD,
    ZB_API_KEY: process.env.ZB_API_KEY || "",
    ZB_API_SECRET: process.env.ZB_API_SECRET || "",
    ZB_API_BASE_URL: process.env.ZB_API_BASE_URL,
    ZB_UTILITIES_BASE_URL: process.env.ZB_UTILITIES_BASE_URL,
    ZB_WEBHOOK_SECRET: process.env.ZB_WEBHOOK_SECRET,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    SMTP_SECURE: process.env.SMTP_SECURE as "true" | "false" | undefined,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
    SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
    RATE_LIMIT_CHECKOUT_PER_MINUTE: process.env.RATE_LIMIT_CHECKOUT_PER_MINUTE ? Number(process.env.RATE_LIMIT_CHECKOUT_PER_MINUTE) : undefined,
    RATE_LIMIT_ACCOUNT_LOGIN_PER_MINUTE: process.env.RATE_LIMIT_ACCOUNT_LOGIN_PER_MINUTE ? Number(process.env.RATE_LIMIT_ACCOUNT_LOGIN_PER_MINUTE) : undefined,
    RATE_LIMIT_ACCOUNT_REGISTER_PER_MINUTE: process.env.RATE_LIMIT_ACCOUNT_REGISTER_PER_MINUTE ? Number(process.env.RATE_LIMIT_ACCOUNT_REGISTER_PER_MINUTE) : undefined,
  } as z.infer<typeof envSchema>;
} else {
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
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      STORE_MANAGER_PASSWORD: process.env.STORE_MANAGER_PASSWORD,
      AUDITOR_PASSWORD: process.env.AUDITOR_PASSWORD,
      ZB_API_KEY: process.env.ZB_API_KEY,
      ZB_API_SECRET: process.env.ZB_API_SECRET,
      ZB_API_BASE_URL: process.env.ZB_API_BASE_URL,
      ZB_UTILITIES_BASE_URL: process.env.ZB_UTILITIES_BASE_URL,
      ZB_WEBHOOK_SECRET: process.env.ZB_WEBHOOK_SECRET,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_SECURE: process.env.SMTP_SECURE,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
      SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
      RATE_LIMIT_CHECKOUT_PER_MINUTE: process.env.RATE_LIMIT_CHECKOUT_PER_MINUTE,
      RATE_LIMIT_ACCOUNT_LOGIN_PER_MINUTE: process.env.RATE_LIMIT_ACCOUNT_LOGIN_PER_MINUTE,
      RATE_LIMIT_ACCOUNT_REGISTER_PER_MINUTE: process.env.RATE_LIMIT_ACCOUNT_REGISTER_PER_MINUTE,
    });
    console.log("✅ Environment variables validated successfully");
  } catch (error) {
    console.error("❌ Environment variable validation failed:");
    if (error instanceof z.ZodError) {
      console.error(JSON.stringify(error.format(), null, 2));
    } else {
      console.error(error);
    }
    throw error;
  }
}

export const env = parsedEnv;
