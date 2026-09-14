import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/context";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { CookieConsentBanner } from "@/components/layout/CookieConsentBanner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "-apple-system", "sans-serif"],
  adjustFontFallback: true,
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["ui-monospace", "monospace"],
  adjustFontFallback: true,
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "RateFactor — Developer Portfolio Discovery & Peer Critique",
  description: "Peer-reviewed developer portfolios. Rated on code quality, architecture, UX, and craft. Daily & Weekly Showcases.",
  keywords: [
    "developer portfolio",
    "code review",
    "software architecture",
    "peer critique",
    "showcase",
    "Next.js",
    "Rust",
    "TypeScript",
  ],
  authors: [{ name: "RateFactor Community" }],
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`scroll-smooth ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-background text-foreground selection:bg-slate-900 selection:text-white relative overflow-x-hidden">
        <AppProviders>
          <div className="relative z-10">
            {children}
          </div>
          <NetworkStatusBanner />
          <CookieConsentBanner />
        </AppProviders>
      </body>
    </html>
  );
}

