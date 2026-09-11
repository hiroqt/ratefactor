"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import { AdykrniShader } from "./AdykrniShader.webgl";

export function Footer() {
  return (
    <footer className="relative bg-[#fafafa] text-slate-900 border-t border-slate-200/80 overflow-hidden select-none min-h-[380px] sm:min-h-[460px] flex flex-col justify-between">
      {/* Background WebGL2 Shader - Same Wave as Hero Section */}
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden z-0"
        aria-hidden="true"
      >
        <AdykrniShader
          theme="light"
          background={{ light: "#fafafa", dark: "#090909" }}
          className="w-full h-full opacity-70 sm:opacity-85"
          onError={(err) => console.warn("WebGL footer shader fallback:", err)}
        />
        {/* Soft top gradient to blend cleanly with preceding section */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#fafafa] via-transparent to-[#fafafa]/50 pointer-events-none" />
        {/* Soft bottom edge mist overlay */}
        <div 
          className="absolute inset-x-0 bottom-0 h-16 sm:h-24 pointer-events-none z-10"
          style={{
            background: "linear-gradient(to top, #fafafa 15%, rgba(250, 250, 250, 0.8) 50%, rgba(250, 250, 250, 0) 100%)",
          }}
        />
      </div>

      {/* Centered Simple Header */}
      <div className="max-w-[1380px] mx-auto px-6 sm:px-10 lg:px-16 pt-14 sm:pt-18 pb-4 relative z-10 flex flex-col items-center justify-center text-center">
        
        {/* Built by @yheellls on TikTok */}
        <div className="mb-2.5">
          <a
            href="https://www.tiktok.com/@yheellls"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 hover:bg-white border border-slate-200/90 text-xs sm:text-sm text-slate-700 shadow-2xs hover:shadow-xs transition-all group backdrop-blur-xs"
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

      {/* Giant Display Typography Emerging from the Wave at Bottom */}
      <div className="relative z-20 w-full overflow-hidden flex items-end justify-center pointer-events-none pb-0">
        <span 
          className="block text-[14vw] sm:text-[15.5vw] md:text-[17vw] font-black uppercase tracking-[-0.045em] leading-[0.82] select-none text-white font-sans text-center transition-all drop-shadow-[0_4px_36px_rgba(0,0,0,0.08)]"
          style={{
            WebkitTextFillColor: "rgba(255, 255, 255, 0.95)",
          }}
        >
          RateFactor
        </span>
      </div>
    </footer>
  );
}
