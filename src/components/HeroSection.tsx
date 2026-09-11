"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowRight, User } from "lucide-react";
import { Portfolio } from "@/types/portfolio";
import { DeveloperProfile } from "@/types/profile";
import { cn } from "@/lib/utils";
import { AdykrniShader } from "./AdykrniShader.webgl";

interface HeroSectionProps {
  showcasePortfolio?: Portfolio | null;
  onInspectShowcase?: (p: Portfolio) => void;
  onSubmitClick: () => void;
  onExploreClick: () => void;
  profile?: DeveloperProfile;
}

export function HeroSection({
  showcasePortfolio,
  onInspectShowcase,
  onSubmitClick,
  onExploreClick,
  profile,
}: HeroSectionProps) {
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(0);
  // Grounded in RateFactor ARD & PRD specifications (Sections 1, 4.1, 4.3, 6)
  const keywords = [
    "PORTFOLIO",
    "DEV CRAFT",
    "CODEBASE",
    "UNIQUENESS",
  ];
  const currentKeyword = keywords[activeKeywordIndex];

  // Auto-cycle keywords every 3.5s with graceful interval
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveKeywordIndex((prev) => (prev + 1) % keywords.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [keywords.length]);

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
          background={{ light: "#fafafa", dark: "#090909" }}
          className="w-full h-full opacity-70 sm:opacity-85"
          onError={(err) => console.warn("WebGL shader fallback:", err)}
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

          {/* Right Column (4 cols): ARD/PRD Core Value, Dual Action CTAs & Showcase Teaser */}
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

              {/* Dedicated Profile Dashboard Feature Card */}
              <Link
                href="/profile"
                className="group flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer w-full"
                title="Open dedicated Profile Dashboard"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={profile?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"}
                      alt={profile?.name || "Developer"}
                      className="w-9 h-9 rounded-md object-cover border border-slate-200"
                    />
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white",
                        profile?.status?.isBusy
                          ? "bg-amber-500"
                          : profile?.status?.statusType === "offline"
                          ? "bg-slate-400"
                          : "bg-emerald-500"
                      )}
                    />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 group-hover:underline truncate">
                        {profile?.name || "Arnel Rivera"}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        @{profile?.username || "arneldev"}
                      </span>
                      {profile?.status?.emoji && (
                        <span className="text-xs">{profile.status.emoji}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {profile?.status?.message || "Bio, status & pinned showcase shelf"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-slate-700 group-hover:text-slate-900 transition-colors shrink-0 pl-3">
                  <span className="hidden sm:inline">Profile</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
                </div>
              </Link>

              {/* Subtitle Paragraph directly quoting PRD Section 1 Core Value */}
              <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed font-normal">
                Discover great developer work, get your work seen, and improve through community feedback. At <strong className="text-slate-950 font-semibold">RateFactor</strong>, engineers showcase codebases, earn authentic peer ratings across our 4-factor rubric, and compete for Daily &amp; Weekly Showcases.
              </p>

              {/* Editorial Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onSubmitClick}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-medium border border-slate-900 transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>Submit Portfolio</span>
                </button>

                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs sm:text-sm font-medium border border-slate-200 transition-colors cursor-pointer group flex-1 sm:flex-initial"
                >
                  <User className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-900 transition-colors" />
                  <span>Profile Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                </Link>

                <button
                  type="button"
                  onClick={onExploreClick}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium border border-slate-200 transition-colors cursor-pointer flex-1 sm:flex-initial"
                >
                  <span>Explore Feed</span>
                  <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

    </section>
  );
}
