"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type GrainyGradientVariant = "hero" | "subtle" | "emerald" | "ambient";
export type GrainyGradientTheme = "light" | "dark";

export interface GrainyGradientProps {
  theme?: GrainyGradientTheme;
  variant?: GrainyGradientVariant;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

// Ultra-optimized, zero-computation SVG noise pattern for the tactile grainy effect
const GRAIN_NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.055'/%3E%3C/svg%3E`;

export function GrainyGradient({
  theme = "light",
  variant = "hero",
  className,
  style,
  children,
}: GrainyGradientProps) {
  const isDark = theme === "dark";

  // Light theme gradient configurations grounded in RateFactor's emerald & editorial slate palette
  const lightGradients = {
    hero: `
      radial-gradient(ellipse 65% 55% at 85% 15%, rgba(16, 185, 129, 0.14) 0%, rgba(52, 211, 153, 0.06) 45%, transparent 75%),
      radial-gradient(ellipse 55% 45% at 15% 35%, rgba(99, 102, 241, 0.06) 0%, rgba(59, 130, 246, 0.03) 50%, transparent 80%),
      radial-gradient(ellipse 70% 60% at 50% 95%, rgba(16, 185, 129, 0.08) 0%, rgba(20, 184, 166, 0.04) 40%, transparent 75%),
      radial-gradient(circle at 60% 50%, rgba(245, 158, 11, 0.03) 0%, transparent 60%),
      #fafafa
    `,
    subtle: `
      radial-gradient(ellipse 70% 50% at 50% 20%, rgba(16, 185, 129, 0.09) 0%, rgba(52, 211, 153, 0.03) 50%, transparent 80%),
      radial-gradient(ellipse 60% 40% at 80% 80%, rgba(99, 102, 241, 0.04) 0%, transparent 70%),
      #fafafa
    `,
    emerald: `
      radial-gradient(circle at 75% 20%, rgba(16, 185, 129, 0.16) 0%, rgba(5, 150, 105, 0.06) 50%, transparent 80%),
      radial-gradient(circle at 20% 80%, rgba(52, 211, 153, 0.10) 0%, transparent 60%),
      #fafafa
    `,
    ambient: `
      radial-gradient(ellipse 80% 60% at 50% 50%, rgba(16, 185, 129, 0.08) 0%, rgba(241, 245, 249, 0.5) 60%, transparent 100%),
      #fafafa
    `,
  };

  // Dark theme gradient configurations
  const darkGradients = {
    hero: `
      radial-gradient(ellipse 65% 55% at 85% 15%, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.10) 45%, transparent 75%),
      radial-gradient(ellipse 55% 45% at 15% 35%, rgba(99, 102, 241, 0.12) 0%, transparent 70%),
      radial-gradient(ellipse 70% 60% at 50% 95%, rgba(16, 185, 129, 0.14) 0%, transparent 75%),
      #090909
    `,
    subtle: `
      radial-gradient(ellipse 70% 50% at 50% 20%, rgba(16, 185, 129, 0.15) 0%, transparent 80%),
      #090909
    `,
    emerald: `
      radial-gradient(circle at 75% 20%, rgba(16, 185, 129, 0.25) 0%, rgba(4, 120, 87, 0.12) 50%, transparent 80%),
      #090909
    `,
    ambient: `
      radial-gradient(ellipse 80% 60% at 50% 50%, rgba(16, 185, 129, 0.12) 0%, transparent 80%),
      #090909
    `,
  };

  const backgroundGradient = isDark ? darkGradients[variant] : lightGradients[variant];

  return (
    <div
      className={cn("relative overflow-hidden w-full h-full", className)}
      style={{
        background: backgroundGradient,
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Grainy Noise Overlay Layer */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        style={{
          backgroundImage: `url("${GRAIN_NOISE_SVG}")`,
          backgroundRepeat: "repeat",
          backgroundSize: "180px 180px",
          mixBlendMode: isDark ? "screen" : "multiply",
          opacity: isDark ? 0.45 : 0.65,
        }}
      />

      {/* Optional content inside gradient container */}
      {children}
    </div>
  );
}
