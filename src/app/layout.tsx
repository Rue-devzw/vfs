import type { Metadata } from "next";
import "./globals.css";
import { ValleyAIAssistant } from "@/features/ai-assistant/components/ValleyAIAssistant";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Valley Farm Secrets",
  description: "Freshness. Quality. Convenience. Your farm-to-table partner.",
  icons: {
    icon: [{ url: "/images/logo.png", type: "image/png" }],
    shortcut: [{ url: "/images/logo.png", type: "image/png" }],
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
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
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
          {children}
          <ValleyAIAssistant />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
