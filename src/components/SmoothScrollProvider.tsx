"use client";

import React, { useEffect, createContext, useContext, useRef } from "react";
import Lenis from "lenis";
import { performanceEngine } from "@/lib/performance";

interface SmoothScrollContextType {
  lenis: Lenis | null;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({ lenis: null });

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. If reduced motion or mobile touch device is detected, rely on native GPU-composited scrolling
    const isTouch = performanceEngine.getIsTouchDevice();
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || isTouch) {
      document.documentElement.style.scrollBehavior = prefersReducedMotion ? "auto" : "smooth";
      return () => {
        document.documentElement.style.scrollBehavior = "";
      };
    }

    // 2. High-performance desktop trackpad & mouse wheel Lenis instance
    let lenis: Lenis | null = null;
    let rafId: number | null = null;

    try {
      lenis = new Lenis({
        duration: 1.0,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        wheelMultiplier: 1.0,
        touchMultiplier: 1.0,
        smoothWheel: true,
        syncTouch: false,
        autoResize: true,
      });

      lenisRef.current = lenis;

      // 3. Continuous high-efficiency RAF pump
      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };

      rafId = requestAnimationFrame(raf);
    } catch (err) {
      console.warn("Lenis smooth scroll fallback to native:", err);
      document.documentElement.style.scrollBehavior = "smooth";
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (lenis) {
        lenis.destroy();
        lenisRef.current = null;
      }
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return (
    <SmoothScrollContext.Provider value={{ lenis: lenisRef.current }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

