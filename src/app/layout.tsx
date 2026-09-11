import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground selection:bg-brand-500/20 selection:text-brand-400">
        {children}
      </body>
    </html>
  );
}
