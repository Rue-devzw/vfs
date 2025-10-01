import type { Metadata } from "next";
import "./globals.css";
import { ValleyAIAssistant } from "@/components/valley-ai-assistant";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
  <link
    href="https://fonts.googleapis.com/css2?family=Alegreya:wght@700&family=Poppins:wght@400;600&display=swap"
    rel="stylesheet"
  />
  <link rel="icon" href="/images/logo.png" type="image/png" />
</head>
      <body className={cn("font-body antialiased", "min-h-screen bg-background font-sans")}>
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
