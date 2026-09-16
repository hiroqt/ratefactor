"use client";

import React, { useState, useEffect } from "react";

export function HeroInteractiveBackground() {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Lightweight mouse coordinate tracker for static pointer illumination
    const handlePointerMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handlePointerLeave = () => {
      setMousePos(null);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
    >
      {/* 1. Base Architectural Hairline Grid (Border Color) */}
      <div
        className="absolute inset-0 opacity-[0.5] dark:opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* 2. Structured Palette Accents: Indigo, Cyan, Emerald, and Amber Technical Anchors */}
      <div
        className="absolute inset-0 opacity-[0.6] dark:opacity-[0.5]"
        style={{
          backgroundImage: `
            radial-gradient(circle 1.5px at 48px 48px, #6366f1 100%, transparent 0),
            radial-gradient(circle 1.5px at 144px 48px, #38bdf8 100%, transparent 0),
            radial-gradient(circle 1.5px at 48px 144px, #10b981 100%, transparent 0),
            radial-gradient(circle 1.5px at 144px 144px, #f59e0b 100%, transparent 0)
          `,
          backgroundSize: "192px 192px",
        }}
      />

      {/* 3. Major Coordinate Registration Crosshairs (+) */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.3]"
        style={{
          backgroundImage: `radial-gradient(circle, var(--muted) 1px, transparent 1px)`,
          backgroundSize: "96px 96px",
          backgroundPosition: "-1px -1px",
        }}
      />

      {/* 4. Subtle Static Interactive Pointer Spotlight (Highlights palette anchors near cursor without CPU animation loop) */}
      {mousePos && (
        <div
          className="absolute pointer-events-none transition-opacity duration-300 opacity-100"
          style={{
            top: `${mousePos.y}px`,
            left: `${mousePos.x}px`,
            width: "480px",
            height: "480px",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, var(--border-hover) 0%, transparent 70%)`,
            opacity: 0.3,
            mixBlendMode: "difference",
          }}
        />
      )}

      {/* 5. Edge Blueprint Hash Marks matching website palette */}
      <div
        className="absolute top-0 left-0 right-0 h-2 opacity-[0.35] dark:opacity-[0.25]"
        style={{
          backgroundImage: `repeating-linear-gradient(to right, var(--muted) 0px, var(--muted) 1px, transparent 1px, transparent 12px)`,
        }}
      />
      <div
        className="absolute left-0 top-0 bottom-0 w-2 opacity-[0.35] dark:opacity-[0.25]"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, var(--muted) 0px, var(--muted) 1px, transparent 1px, transparent 12px)`,
        }}
      />

      {/* 6. Dual Contrast Scrim: Preserves sharp foreground typography readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-background/10 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_65%,transparent_0%,var(--background)_80%)] opacity-75" />
    </div>
  );
}
