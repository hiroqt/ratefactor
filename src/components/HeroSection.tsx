"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "@/components/ui/icons";
import { Portfolio } from "@/types/portfolio";
import { DeveloperProfile, DeveloperSummary } from "@/types/profile";
import { normalizeAvatarUrl, getOptimizedImageUrl } from "@/lib/utils";
import { performanceEngine } from "@/lib/performance";
import { AuthUser } from "@/features/auth/hooks/useAuth";

function getInitialsAvatar(nameOrUsername?: string) {
  const letters = (nameOrUsername || "DEV").trim().slice(0, 2).toUpperCase();
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><circle cx='40' cy='40' r='40' fill='%231e293b'/><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='26' font-weight='bold' fill='%2394a3b8'>${encodeURIComponent(letters)}</text></svg>`;
}

interface HeroSectionProps {
  showcasePortfolio?: Portfolio | null;
  onInspectShowcase?: (p: Portfolio) => void;
  onSubmitClick: () => void;
  onExploreClick: () => void;
  profile?: DeveloperProfile;
  currentUser?: AuthUser | null;
  totalDevelopers?: number;
  onVisitUser?: (user: DeveloperProfile) => void;
}

export function HeroSection({
  showcasePortfolio,
  onInspectShowcase,
  onSubmitClick,
  onExploreClick,
  profile,
  currentUser,
  totalDevelopers,
  onVisitUser,
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

  const [developers, setDevelopers] = useState<DeveloperSummary[]>([]);
  const [realTotalCount, setRealTotalCount] = useState<number>(totalDevelopers ?? 0);

  // Fetch real registered developer profiles from backend API (queries PostgreSQL public.profiles)
  useEffect(() => {
    let isMounted = true;
    async function loadDevelopers() {
      try {
        const res = await fetch("/api/developers?limit=10", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data?.developers && Array.isArray(data.developers)) {
          setDevelopers(data.developers);
          if (typeof data.totalCount === "number" && data.totalCount > 0) {
            setRealTotalCount(data.totalCount);
          }
        }
      } catch {
        // Keep real state
      }
    }
    loadDevelopers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute displayed 4 avatars with the real existing user included
  const displayedDevelopers = React.useMemo(() => {
    const list: DeveloperSummary[] = [];
    const seenUsernames = new Set<string>();

    // 1. If currentUser or active profile exists, place existing user in the front
    if (currentUser?.username) {
      const uname = currentUser.username.toLowerCase();
      seenUsernames.add(uname);
      list.push({
        id: currentUser.id || "current-user",
        username: currentUser.username,
        name: currentUser.name || "Developer",
        avatar: currentUser.avatar || profile?.avatar || "",
        role: currentUser.role || "developer",
      });
    } else if (profile?.username && profile.username !== "developer") {
      const uname = profile.username.toLowerCase();
      seenUsernames.add(uname);
      list.push({
        id: profile.id || "profile-user",
        username: profile.username,
        name: profile.name || "Developer",
        avatar: profile.avatar || "",
        role: profile.role || "developer",
      });
    }

    // 2. Fill remaining slots from real developers queried from database
    for (const dev of developers) {
      if (list.length >= 4) break;
      const uname = dev.username.toLowerCase();
      if (!seenUsernames.has(uname)) {
        seenUsernames.add(uname);
        list.push(dev);
      }
    }

    return list.slice(0, 4);
  }, [developers, currentUser, profile]);

  const statCount = Math.max(realTotalCount, totalDevelopers ?? 0, displayedDevelopers.length);

  const handleAvatarClick = (dev: DeveloperSummary) => {
    if (onVisitUser) {
      onVisitUser({
        id: dev.id,
        name: dev.name,
        username: dev.username,
        avatar: dev.avatar,
        role: dev.role,
        bio: "",
        status: {
          emoji: "🚀",
          message: "Showcasing on RateFactor",
          statusType: "available",
        },
        skills: [],
        pinnedPortfolioIds: [],
        joinedDate: "2026",
        isVerified: dev.isVerified,
      });
    } else {
      onExploreClick();
    }
  };

  const handleToggleKeyword = () => {
    setActiveKeywordIndex((prev) => (prev + 1) % keywords.length);
  };

  return (
    <section className="relative w-full min-h-[85vh] lg:min-h-[90vh] flex flex-col justify-between overflow-hidden select-none bg-background text-foreground">
      {/* Top spacing to account for floating nav */}
      <div className="h-20 sm:h-24" />

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-[1380px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col justify-end pb-12 sm:pb-16 lg:pb-20 z-10">
        
        {/* Content Grid: Headline shifted left + Right Subtitle & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 xl:gap-16 items-end">
          
          {/* Left Column (7 cols): Massive Editorial Typography */}
          <div className="lg:col-span-7 flex flex-col justify-end min-w-0 pr-0 lg:pr-4 xl:pr-6">
            {/* Top of the headline on the left: Real Developers Social Proof Widget */}
            {displayedDevelopers.length > 0 && (
              <div className="mb-4 sm:mb-6 flex items-center justify-start">
                <div className="inline-flex items-center gap-3.5 sm:gap-4 py-0.5">
                  {/* Overlapping Avatar Stack */}
                  <div className="flex items-center -space-x-2.5 sm:-space-x-3 shrink-0">
                    {displayedDevelopers.map((dev, idx) => {
                      const fallbackSvg = getInitialsAvatar(dev.name || dev.username);
                      const avatarSrc = dev.avatar
                        ? getOptimizedImageUrl(normalizeAvatarUrl(dev.avatar, dev.username), 80, 80)
                        : fallbackSvg;

                      return (
                        <div
                          key={dev.id || dev.username || idx}
                          onClick={() => handleAvatarClick(dev)}
                          title={`@${dev.username} (${dev.name})`}
                          className="relative rounded-full transition-transform duration-200 hover:scale-115 hover:z-50 cursor-pointer shadow-xs group/avatar"
                          style={{ zIndex: 10 + idx }}
                        >
                          <img
                            src={avatarSrc}
                            alt={dev.name || dev.username}
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (target.src !== fallbackSvg) {
                                target.src = fallbackSvg;
                              }
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-[#1c1c21] dark:border-[#222228] ring-1 ring-black/40 bg-[#161619]"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Stat Text: Unique Developers & Explore Navigation */}
                  <div className="flex flex-col text-left justify-center">
                    <div className="text-sm sm:text-base leading-tight tracking-tight font-sans">
                      <strong className="font-bold text-foreground">
                        {statCount > 0 ? statCount.toLocaleString() : displayedDevelopers.length}
                      </strong>{" "}
                      <span className="text-slate-600 dark:text-zinc-400 font-normal">
                        unique developers
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onExploreClick}
                      className="text-xs sm:text-[13px] text-slate-500 dark:text-zinc-400 hover:text-foreground transition-colors text-left font-normal cursor-pointer leading-tight mt-0.5 tracking-tight"
                    >
                      Explore the component library
                    </button>
                  </div>
                </div>
              </div>
            )}

            <h1 className="text-3xl min-[360px]:text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-[2.75rem] xl:text-[3.5rem] 2xl:text-[4.25rem] font-black uppercase tracking-[-0.04em] leading-[0.92] text-foreground font-sans drop-shadow-xs dark:drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
              <span className="block break-normal">SHOWCASING</span>
              <span className="block break-normal">
                <button
                  type="button"
                  onClick={handleToggleKeyword}
                  title="Click to cycle: PORTFOLIO / DEV CRAFT / CODEBASE / UNIQUENESS"
                  className="inline-flex items-baseline group text-left cursor-pointer hover:opacity-85 transition-opacity"
                  aria-label={`Current focus: ${currentKeyword}. Click to cycle.`}
                >
                  <span className="inline-block relative overflow-hidden align-baseline">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={currentKeyword}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -14 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className="inline-block text-foreground font-black tracking-[-0.04em]"
                      >
                        {currentKeyword}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </button>{" "}
                TODAY
              </span>
              <span className="block break-normal">RATED BY PEERS.</span>
            </h1>
          </div>

          {/* Right Column (5 cols): ARD/PRD Core Value & Dual Action CTAs */}
          <div className="lg:col-span-5 flex flex-col items-start lg:items-end justify-end pt-8 sm:pt-10 lg:pt-0 min-w-0 pl-0 lg:pl-2 xl:pl-4">
            <div className="max-w-[480px] lg:max-w-[520px] space-y-4 sm:space-y-5 lg:space-y-6 w-full">
              {/* Daily Showcase Teaser Link (if available) */}
              {showcasePortfolio && onInspectShowcase && (
                <div className="flex items-center w-full">
                  <button
                    type="button"
                    onClick={() => onInspectShowcase(showcasePortfolio)}
                    className="inline-flex items-center gap-2 text-xs font-mono text-muted hover:text-foreground transition-colors group cursor-pointer text-left max-w-full dark:drop-shadow-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="truncate">
                      Daily Pick: <strong className="text-foreground group-hover:underline font-semibold">{showcasePortfolio.title}</strong>
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted group-hover:text-foreground transition-colors shrink-0" />
                  </button>
                </div>
              )}

              {/* Subtitle Paragraph (Natural text with dark mode contrast & drop shadow) */}
              <p className="text-base sm:text-lg lg:text-[17px] xl:text-[19px] text-slate-700 dark:text-zinc-200 leading-relaxed font-normal tracking-[-0.01em] dark:drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
                Discover great developer work, get your work seen, and improve through community feedback. At <strong className="text-foreground font-semibold">RateFactor</strong>, engineers showcase codebases, earn authentic peer ratings across our 3-factor rubric, and compete for Daily &amp; Weekly Showcases.
              </p>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onSubmitClick}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-foreground text-background hover:opacity-90 text-xs sm:text-sm font-medium transition-all shadow-xs hover:shadow-sm cursor-pointer w-full sm:w-auto"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>Submit Portfolio</span>
                </button>

                <button
                  type="button"
                  onClick={onExploreClick}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-surface/90 hover:bg-surface-raised text-foreground text-xs sm:text-sm font-medium border border-border transition-colors shadow-2xs cursor-pointer flex-1 sm:flex-initial backdrop-blur-xs"
                >
                  <span>Discover Feed</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

    </section>
  );
}
