"use client";

import { useEffect, useRef, RefObject } from "react";
import Lenis from "lenis";

interface UseModalSmoothScrollOptions {
  isOpen: boolean;
  modalRef: RefObject<HTMLElement | null>;
  scrollRef: RefObject<HTMLElement | null>;
  deps?: any[];
}

/**
 * Provides momentum-based smooth inertia scrolling inside modal dialogs
 * matching the page-level Lenis smooth scroll curve and physics.
 */
export function useModalSmoothScroll({
  isOpen,
  modalRef,
  scrollRef,
  deps = [],
}: UseModalSmoothScrollOptions) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const lenis = new Lenis({
      wrapper: scrollEl,
      content: scrollEl,
      eventsTarget: modalRef.current || scrollEl,
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
      infinite: false,
      autoResize: true,
      overscroll: false,
    });

    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    const timeout = setTimeout(() => {
      lenis.resize();
    }, 60);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.resize();
    }
  }, deps);

  return lenisRef;
}
