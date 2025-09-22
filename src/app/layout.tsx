import type { Metadata } from "next"; 
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { VallieyAssistant } from "@/components/pages/store/valliey-assistant";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Valley Farm Secrets",
  description: "Freshness. Quality. Convenience. Your farm-to-table partner.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
  <link
    href="https://fonts.googleapis.com/css2?family=Alegreya:wght@700&family=Poppins:wght@400;600&display=swap"
    rel="stylesheet"
  />
  <link rel="icon" href="/favicon.ico" type="image/x-icon" />
</head>
      <body className={cn("font-body antialiased", "min-h-screen bg-background font-sans")}>
        {children}
        <VallieyAssistant />
        <Toaster />
      </body>
    </html>
  );
}
