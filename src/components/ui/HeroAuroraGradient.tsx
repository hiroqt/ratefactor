"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface HeroAuroraGradientProps {
  className?: string;
  interactive?: boolean;
}

// Ultra-optimized tactile film grain to eliminate digital color banding
const GRAIN_NOISE_SVG = "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.055'/%3E%3C/svg%3E";

export function HeroAuroraGradient({
  className = "",
  interactive = true,
}: HeroAuroraGradientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interactive) return;
    const container = containerRef.current?.parentElement;
    const glow = glowRef.current;
    if (!container || !glow) return;

    let targetX = 50;
    let targetY = 50;
    let currentX = 50;
    let currentY = 50;
    let animId: number;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      targetX = x;
      targetY = y;
    };

    const updatePosition = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      if (glow) {
        glow.style.transform = "translate(" + ((currentX - 50) * 0.25) + "px, " + ((currentY - 50) * 0.25) + "px)";
      }
      animId = requestAnimationFrame(updatePosition);
    };

    container.addEventListener("pointermove", handlePointerMove);
    animId = requestAnimationFrame(updatePosition);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(animId);
    };
  }, [interactive]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none bg-[#070810] dark:bg-[#070810]",
        className
      )}
    >
      {/* 1. Master High-Resolution Aurora Gradient (Rendered at 2560x1440 WebP) */}
      <div
        ref={glowRef}
        className="absolute -inset-[5%] w-[110%] h-[110%] transition-transform duration-700 ease-out will-change-transform"
      >
        <img
          src="/images/hero-aurora-gradient.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover object-center opacity-95 dark:opacity-100 animate-liquid-drift scale-105"
        />
      </div>

      {/* 2. Soft Dynamic Ambient Light Overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 55% 45% at 20% 45%, rgba(245, 158, 11, 0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 85% 65%, rgba(14, 165, 233, 0.14) 0%, transparent 70%), radial-gradient(ellipse 50% 35% at 50% 20%, rgba(124, 58, 237, 0.10) 0%, transparent 70%)",
        }}
      />

      {/* 3. Tactile Micro-Grain Film Overlay (Eliminates digital banding) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("${GRAIN_NOISE_SVG}")`,
          backgroundRepeat: "repeat",
          backgroundSize: "180px 180px",
          mixBlendMode: "screen",
          opacity: 0.22,
        }}
      />

      {/* 4. Soft Vignette and Seamless Bottom Fade to Page Background */}
      <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-transparent to-[#070810]/40" />
      <div className="absolute inset-x-0 bottom-0 h-36 sm:h-48 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
    </div>
  );
}
