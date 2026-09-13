"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowRight, Users } from "lucide-react";
import { Portfolio } from "@/types/portfolio";
import { DeveloperProfile } from "@/types/profile";
import { cn, formatNumber } from "@/lib/utils";
import { AdykrniShader } from "./AdykrniShader.webgl";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { performanceEngine } from "@/lib/performance";

interface HeroSectionProps {
  showcasePortfolio?: Portfolio | null;
  onInspectShowcase?: (p: Portfolio) => void;
  onSubmitClick: () => void;
  onExploreClick: () => void;
  profile?: DeveloperProfile;
  totalDevelopers?: number;
}

const SHADER_BACKGROUND = { light: "#fafafa", dark: "#090909" };
const handleShaderError = (err: Error) => {
  console.warn("WebGL shader fallback:", err);
};

export function HeroSection({
  showcasePortfolio,
  onInspectShowcase,
  onSubmitClick,
  onExploreClick,
  profile,
  totalDevelopers,
}: HeroSectionProps) {
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(0);
  const [animatedCount, setAnimatedCount] = useState(0);
  // Grounded in RateFactor ARD & PRD specifications (Sections 1, 4.1, 4.3, 6)
  const keywords = [
    "PORTFOLIO",
    "DEV CRAFT",
    "CODEBASE",
    "UNIQUENESS",
  ];
  const currentKeyword = keywords[activeKeywordIndex];

  // Auto-cycle keywords every 3.5s with graceful interval, paused in background tab
  useEffect(() => {
    let timer: any = null;

    const startTimer = () => {
      if (timer) clearInterval(timer);
      if (document.hidden) return;
      timer = setInterval(() => {
        if (!document.hidden) {
          setActiveKeywordIndex((prev) => (prev + 1) % keywords.length);
        }
      }, 3500);
    };

    startTimer();

    const unbindVis = performanceEngine.onVisibilityChange((visible) => {
      if (visible) {
        startTimer();
      } else if (timer) {
        clearInterval(timer);
        timer = null;
      }
    });

    return () => {
      if (timer) clearInterval(timer);
      unbindVis();
    };
  }, [keywords.length]);

  const devCount = totalDevelopers ?? 0;

  // On opening/mount, start counting smoothly from 0 to real developer count
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedCount(devCount);
    }, 150);
    return () => clearTimeout(timer);
  }, [devCount]);

  const handleToggleKeyword = () => {
    setActiveKeywordIndex((prev) => (prev + 1) % keywords.length);
  };

  return (
    <section className="relative w-full min-h-[85vh] lg:min-h-[90vh] flex flex-col justify-between overflow-hidden select-none bg-[#fafafa] text-slate-950">
      
      {/* Background WebGL2 OpenShaders Adykrni Shader */}
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden z-0"
        aria-hidden="true"
      >
        <AdykrniShader
          theme="light"
          background={SHADER_BACKGROUND}
          className="w-full h-full opacity-70 sm:opacity-85"
          onError={handleShaderError}
        />
        {/* Subtle gradient vignette to preserve pristine editorial typography contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#fafafa] via-transparent to-[#fafafa]/50 pointer-events-none" />
      </div>

      {/* Top spacing to account for floating nav */}
      <div className="h-20 sm:h-24" />

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-[1380px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col justify-end pb-12 sm:pb-16 lg:pb-20 z-10">
        
        {/* Content Grid: Headline shifted left + Right Subtitle & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-end">
          
          {/* Left Column (8 cols): Massive Editorial Typography grounded in ARD & PRD */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-8 flex flex-col justify-end -ml-1 sm:-ml-2 lg:-ml-3"
          >
            <h1 className="text-[2.2rem] min-[360px]:text-[2.6rem] xs:text-[3.2rem] sm:text-[4rem] md:text-[4.6rem] lg:text-[4.4rem] xl:text-[5rem] 2xl:text-[5.6rem] font-black uppercase tracking-[-0.04em] leading-[0.93] text-slate-950 font-sans">
              <span className="block break-words sm:whitespace-nowrap">SHOWCASING</span>
              <span className="block break-words sm:whitespace-nowrap">
                <button
                  type="button"
                  onClick={handleToggleKeyword}
                  title="Click to cycle: PORTFOLIO / DEV CRAFT / CODEBASE / UNIQUENESS"
                  className="inline-flex items-baseline group text-left cursor-pointer hover:opacity-85 transition-opacity"
                  aria-label={`Current focus: ${currentKeyword}. Click to cycle.`}
                >
                  <span className="inline-block relative overflow-hidden align-baseline">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={currentKeyword}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -14 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className="inline-block text-slate-950 font-black tracking-[-0.04em]"
                      >
                        {currentKeyword}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </button>{" "}
                TODAY
              </span>
              <span className="block break-words sm:whitespace-nowrap">RATED BY PEERS.</span>
            </h1>
          </motion.div>

          {/* Right Column (4 cols): ARD/PRD Core Value, Total Developers & Dual Action CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4 flex flex-col items-start lg:items-end justify-end pt-8 sm:pt-10 lg:pt-0"
          >
            <div className="max-w-[360px] sm:max-w-[420px] space-y-4 sm:space-y-5 w-full">
              {/* Daily Showcase Teaser Link (if available) */}
              {showcasePortfolio && onInspectShowcase && (
                <div className="flex items-center w-full">
                  <button
                    type="button"
                    onClick={() => onInspectShowcase(showcasePortfolio)}
                    className="inline-flex items-center gap-2 text-xs font-mono text-slate-600 hover:text-slate-900 transition-colors group cursor-pointer text-left max-w-full"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="truncate">
                      Daily Pick: <strong className="text-slate-900 group-hover:underline font-semibold">{showcasePortfolio.title}</strong>
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-slate-900 transition-colors shrink-0" />
                  </button>
                </div>
              )}

              {/* Total Developers Live Counter Badge (Replaced User Profile card) */}
              <div className="flex items-center">
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-2xs backdrop-blur-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-600">Total Developers:</span>
                    <span className="font-bold text-slate-950 font-mono tracking-tight text-xs inline-flex items-center">
                      <AnimatedCounter value={animatedCount} duration={1.2} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Subtitle Paragraph directly quoting PRD Section 1 Core Value */}
              <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed font-normal">
                Discover great developer work, get your work seen, and improve through community feedback. At <strong className="text-slate-950 font-semibold">RateFactor</strong>, engineers showcase codebases, earn authentic peer ratings across our 3-factor rubric, and compete for Daily &amp; Weekly Showcases.
              </p>

              {/* Editorial Action Buttons Row (Submit Portfolio & Explore Feed) */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onSubmitClick}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-medium border border-slate-900 transition-all shadow-xs hover:shadow-sm cursor-pointer w-full sm:w-auto"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>Submit Portfolio</span>
                </button>

                <button
                  type="button"
                  onClick={onExploreClick}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-medium border border-slate-200 transition-colors shadow-2xs cursor-pointer flex-1 sm:flex-initial"
                >
                  <span>Discover Feed</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

    </section>
  );
}
