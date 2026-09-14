"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Cookie } from "@/components/ui/icons";

export function Footer() {
  return (
    <footer className="relative bg-background text-foreground border-t border-border overflow-hidden select-none min-h-[340px] sm:min-h-[420px] flex flex-col justify-between">
      {/* Centered Simple Header */}
      <div className="max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-16 pt-14 sm:pt-18 pb-4 relative z-10 flex flex-col items-center justify-center text-center">

        {/* Built by @yheellls & @iyawn.ts on TikTok */}
        <div className="mb-2.5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/85 hover:bg-surface-raised border border-border text-xs sm:text-sm text-foreground shadow-2xs hover:shadow-xs transition-all group backdrop-blur-xs">
            <span className="text-muted">Built by</span>

            <a
              href="https://www.tiktok.com/@yheelllls"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-foreground group-hover:text-rose-500 transition-colors"
            >
              @yheellls
            </a>

            <span className="text-muted">&</span>

            <a
              href="https://www.tiktok.com/@iyawn.ts"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-foreground group-hover:text-rose-500 transition-colors"
            >
              @iyawn.ts
            </a>

            <span className="text-muted">on TikTok</span>

            <ArrowUpRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </div>

        {/* All rights reserved, Privacy, Terms, and Cookies trigger */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs text-muted font-mono drop-shadow-xs">
          <span>© 2026 RateFactor · All rights reserved</span>
          <span className="opacity-30">·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors cursor-pointer">
            Privacy
          </Link>
          <span className="opacity-30">·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors cursor-pointer">
            Terms
          </Link>
          <span className="opacity-30">·</span>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("rf_open_cookie_preferences"));
              }
            }}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
          >
            <Cookie className="w-3.5 h-3.5 text-amber-500" />
            <span>Cookies</span>
          </button>
        </div>
      </div>

      {/* Giant Display Typography at Bottom */}
      <div className="relative z-20 w-full overflow-hidden flex items-end justify-center pointer-events-none pb-0">
        <span
          className="block text-[14vw] sm:text-[15.5vw] md:text-[17vw] font-black uppercase tracking-[-0.045em] leading-[0.82] select-none text-slate-400/60 font-sans text-center transition-all drop-shadow-xs"
        >
          RateFactor
        </span>
      </div>
    </footer>
  );
}

