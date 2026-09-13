"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative bg-[#fafafa] text-slate-900 border-t border-slate-200/80 overflow-hidden select-none min-h-[340px] sm:min-h-[420px] flex flex-col justify-between">
      {/* Centered Simple Header */}
      <div className="max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-16 pt-14 sm:pt-18 pb-4 relative z-10 flex flex-col items-center justify-center text-center">
        
        {/* Built by @yheellls on TikTok */}
        <div className="mb-2.5">
          <a
            href="https://www.tiktok.com/@yheellls"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200/90 text-xs sm:text-sm text-slate-700 shadow-2xs hover:shadow-xs transition-all group backdrop-blur-xs"
          >
            <span>Built by</span>
            <span className="font-bold text-slate-950 group-hover:text-rose-600 transition-colors">
              @yheellls
            </span>
            <span className="text-slate-500">on TikTok</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>
        </div>

        {/* All rights reserved below */}
        <p className="text-xs text-slate-400 font-mono">
          © 2026 RateFactor · All rights reserved
        </p>
      </div>

      {/* Giant Display Typography at Bottom */}
      <div className="relative z-20 w-full overflow-hidden flex items-end justify-center pointer-events-none pb-0">
        <span 
          className="block text-[14vw] sm:text-[15.5vw] md:text-[17vw] font-black uppercase tracking-[-0.045em] leading-[0.82] select-none text-slate-200/90 font-sans text-center transition-all"
        >
          RateFactor
        </span>
      </div>
    </footer>
  );
}
