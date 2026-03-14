import { env } from "./env";

export function isEmailConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM_EMAIL);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
}) {
  if (!isEmailConfigured()) {
    throw new Error("SMTP is not configured.");
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST!,
    port: env.SMTP_PORT!,
    secure: env.SMTP_SECURE === "true",
    auth: {
      user: env.SMTP_USER!,
      pass: env.SMTP_PASS!,
    },
  });

  const fromName = env.SMTP_FROM_NAME?.trim();
  const from = fromName
    ? `"${fromName}" <${env.SMTP_FROM_EMAIL!}>`
    : env.SMTP_FROM_EMAIL!;

  return transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
}
