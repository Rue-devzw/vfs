import type { Metadata } from "next";
import "./globals.css";
import { ValleyAIAssistant } from "@/features/ai-assistant/components/ValleyAIAssistant";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { CurrencyProvider } from "@/components/currency/currency-provider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://valleyfarmsecrets.com"),
  title: {
    default: "Valley Farm Secrets | Fresh Farm-to-Table Quality",
    template: "%s | Valley Farm Secrets",
  },
  description: "Freshness. Quality. Convenience. Your premier farm-to-table partner supplying fresh produce, groceries, and digital farm solutions.",
  keywords: [
    "Valley Farm Secrets",
    "Farm to Table",
    "Fresh Produce",
    "Groceries",
    "Agriculture",
    "Digital Farm Solutions",
    "Wholesale Produce",
    "Local Farmers"
  ],
  authors: [{ name: "Valley Farm Secrets Team" }],
  creator: "Valley Farm Secrets",
  publisher: "Valley Farm Secrets",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Valley Farm Secrets | Fresh Farm-to-Table Quality",
    description: "Freshness. Quality. Convenience. Your premier farm-to-table partner supplying fresh produce, groceries, and digital farm solutions.",
    url: "/",
    siteName: "Valley Farm Secrets",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Valley Farm Secrets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Valley Farm Secrets | Fresh Farm-to-Table Quality",
    description: "Freshness. Quality. Convenience. Your premier farm-to-table partner supplying fresh produce, groceries, and digital farm solutions.",
    images: ["/images/og-image.webp"],
    creator: "@valleyfarmsecrets",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/images/logo.webp", type: "image/webp" },
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/images/logo.webp", type: "image/webp" }],
  },
};

import { Poppins, Alegreya } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const alegreya = Alegreya({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-headline",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          poppins.variable,
          alegreya.variable,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CurrencyProvider>
            <ErrorBoundary>
              {children}
              <ValleyAIAssistant />
            </ErrorBoundary>
            <Toaster />
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
