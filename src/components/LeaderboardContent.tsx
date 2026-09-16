"use client";

import React, { useState, useMemo } from "react";
import {
  Trophy,
  Star,
  Heart,
  MessageSquare,
  CheckCircle2,
  ArrowUpRight,
  Layers,
  ArrowRight,
} from "@/components/ui/icons";
import { Portfolio, PortfolioCategory } from "@/types/portfolio";
import { GooeyNav } from "@/components/ui/gooey-nav";
import { cn, formatNumber, formatRating, getOptimizedImageUrl } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import {
  sortLeaderboardItems,
  getDisplayUpvotes,
} from "@/lib/leaderboard-utils";

// Domain categories strictly aligned with the discover apps and submit modal
export const DOMAIN_CATEGORIES: { label: string; value: PortfolioCategory }[] = [
  { label: "All Domains", value: "All" },
  { label: "Developer", value: "Developer" },
  { label: "AI / ML", value: "AI / ML" },
  { label: "Frontend", value: "Frontend" },
  { label: "Fullstack", value: "Fullstack" },
  { label: "Systems", value: "Systems" },
  { label: "Design Engineer", value: "Design Engineer" },
  { label: "Mobile", value: "Mobile" },
  { label: "Client", value: "Client" },
  { label: "Arts", value: "Arts" },
];

const FALLBACK_THUMBNAIL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'><rect width='800' height='450' fill='%23f1f5f9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='22' fill='%2394a3b8'>Preview Unavailable</text></svg>";

const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23e2e8f0'/><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32' fill='%2364748b'>DEV</text></svg>";

function onImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.currentTarget;
  if (!target.src.startsWith("data:")) {
    target.src = FALLBACK_THUMBNAIL;
  }
}

function onAvatarError(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.currentTarget;
  if (!target.src.startsWith("data:")) {
    target.src = FALLBACK_AVATAR;
  }
}

function getCategoryColor(cat: string) {
  switch (cat) {
    case "Developer":
      return "text-indigo-800 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800/60";
    case "Arts":
      return "text-rose-800 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800/60";
    case "Client":
      return "text-teal-800 bg-teal-50 border-teal-200 dark:text-teal-300 dark:bg-teal-950/40 dark:border-teal-800/60";
    case "Systems":
      return "text-amber-800 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800/60";
    case "Design Engineer":
      return "text-pink-800 bg-pink-50 border-pink-200 dark:text-pink-300 dark:bg-pink-950/40 dark:border-pink-800/60";
    case "Frontend":
      return "text-sky-800 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/40 dark:border-sky-800/60";
    case "Fullstack":
      return "text-emerald-800 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/60";
    case "AI / ML":
      return "text-purple-800 bg-purple-50 border-purple-200 dark:text-purple-300 dark:bg-purple-950/40 dark:border-purple-800/60";
    case "Mobile":
      return "text-blue-800 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800/60";
    default:
      return "text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-zinc-800 dark:border-zinc-700";
  }
}

export type TimeHorizonTab = "all" | "week" | "today";

export interface LeaderboardContentProps {
  portfolios: Portfolio[];
  onSelectPortfolio: (portfolio: Portfolio) => void;
  onLikeToggle?: (id: string, liked: boolean) => void;
  onReact?: (id: string, emojiName: string) => void;
  currentUser?: any;
}

export function LeaderboardContent({
  portfolios,
  onSelectPortfolio,
  onLikeToggle,
}: LeaderboardContentProps) {
  const [activeCategory, setActiveCategory] = useState<PortfolioCategory>("All");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizonTab>("all");

  // Compute active category index for GooeyNav
  const activeCategoryIndex = useMemo(() => {
    const idx = DOMAIN_CATEGORIES.findIndex((c) => c.value === activeCategory);
    return idx === -1 ? 0 : idx;
  }, [activeCategory]);

  const handleCategoryChange = (category: PortfolioCategory) => {
    setActiveCategory(category);
    trackEvent("leaderboard_category_filter", { category, timeHorizon });
  };

  const handleTimeHorizonChange = (tab: TimeHorizonTab) => {
    setTimeHorizon(tab);
    trackEvent("leaderboard_time_horizon_change", { timeHorizon: tab });
  };

  // Overall ranked portfolios across all domains based on time horizon
  const overallRanked = useMemo(() => {
    return sortLeaderboardItems(portfolios, timeHorizon, portfolios.length);
  }, [portfolios, timeHorizon]);

  // Overall #1 champion and podium runners-up
  const overallChampion = overallRanked[0] || null;
  const overallRunnersUp = overallRanked.slice(1, 3);

  // Per-domain mapping based on selected time horizon
  const domainLeadingMap = useMemo(() => {
    const map = new Map<
      PortfolioCategory,
      { leader: Portfolio | null; all: Portfolio[]; count: number }
    >();

    DOMAIN_CATEGORIES.forEach((cat) => {
      if (cat.value !== "All") {
        const domainItems = portfolios.filter((p) => p.category === cat.value);
        const sortedDomainItems = sortLeaderboardItems(domainItems, timeHorizon, domainItems.length);

        map.set(cat.value, {
          leader: sortedDomainItems[0] || null,
          all: sortedDomainItems,
          count: sortedDomainItems.length,
        });
      }
    });

    return map;
  }, [portfolios, timeHorizon]);

  // Portfolios for the currently active category
  const activeCategoryPortfolios = useMemo(() => {
    if (activeCategory === "All") return overallRanked;
    return domainLeadingMap.get(activeCategory)?.all || [];
  }, [activeCategory, overallRanked, domainLeadingMap]);

  // Prepare items for GooeyNav
  const gooeyNavItems = useMemo(() => {
    return DOMAIN_CATEGORIES.map((cat) => ({
      label: cat.label,
    }));
  }, []);

  const totalPortfoliosCount = portfolios.length;

  return (
    <section className="py-8 sm:py-10 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ========================================================================= */}
        {/* 1. STRONG CLEAN HEADER (No eyebrow, no gradients, motivational message)    */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Engineering Leaderboard
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 mt-2 max-w-3xl leading-relaxed font-normal">
              Honoring exceptional craftsmanship, open-source architectures, and developer dedication. Every upvote represents authentic peer recognition from fellow engineers.
            </p>
          </div>

          {/* Time Horizon Switcher (Like Showcase) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
            <div
              role="tablist"
              aria-label="Leaderboard time horizons"
              className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono"
            >
              <button
                type="button"
                role="tab"
                aria-selected={timeHorizon === "all"}
                onClick={() => handleTimeHorizonChange("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
                  timeHorizon === "all"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                All Time
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={timeHorizon === "week"}
                onClick={() => handleTimeHorizonChange("week")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
                  timeHorizon === "week"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                This Week
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={timeHorizon === "today"}
                onClick={() => handleTimeHorizonChange("today")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
                  timeHorizon === "today"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Today
              </button>
            </div>

            <div className="hidden sm:flex px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs font-mono text-slate-600 dark:text-slate-400 items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{totalPortfoliosCount} ranked</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. OVERALL LEADING PORTFOLIO SPOTLIGHT (Like the Showcase Spotlight)       */}
        {/* ========================================================================= */}
        {overallChampion && (
          <div className="mb-10">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {timeHorizon === "today"
                    ? "Top Architecture Today"
                    : timeHorizon === "week"
                    ? "Weekly Champion"
                    : "Overall Leading Portfolio"}
                </h2>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  #1 Most Upvoted
                </span>
              </div>
            </div>

            {/* Showcase-style Hero Spotlight Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121215] shadow-xs">
              {/* Media Preview (5 cols on lg) */}
              <div
                onClick={() => onSelectPortfolio(overallChampion)}
                className="lg:col-span-5 relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 cursor-pointer group"
              >
                <img
                  src={getOptimizedImageUrl(overallChampion.thumbnail, 720, 80)}
                  alt={overallChampion.title}
                  loading="lazy"
                  decoding="async"
                  onError={onImgError}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Rating Badge */}
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/95 dark:bg-[#18181b]/95 border border-slate-200 dark:border-white/10 text-xs font-mono font-medium text-slate-900 dark:text-white flex items-center gap-1 backdrop-blur-xs">
                  {overallChampion.ratingCount > 0 ? (
                    <>
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                      <span className="font-bold tabular-nums">
                        {formatRating(overallChampion.rating)}
                      </span>
                    </>
                  ) : (
                    <span>Unrated</span>
                  )}
                </div>

                {/* Inspect Indicator on Hover */}
                <div className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-white/95 dark:bg-zinc-900/95 text-slate-900 dark:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs pointer-events-none">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              {/* Information & Metrics (7 cols on lg) */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  {/* Top Badges Row */}
                  <div className="flex items-center gap-2 flex-wrap mb-2.5">
                    <span
                      className={cn(
                        "text-[10px] sm:text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md border shrink-0",
                        getCategoryColor(overallChampion.category)
                      )}
                    >
                      {overallChampion.category}
                    </span>

                    <span className="text-[10px] sm:text-xs font-mono text-slate-500 dark:text-slate-400">
                      Engineering Champion
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h3
                    onClick={() => onSelectPortfolio(overallChampion)}
                    className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    {overallChampion.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {overallChampion.tagline}
                  </p>

                  {/* Showcase-style 3-Factor Rubric Progress Bars */}
                  {overallChampion.ratingBreakdown && overallChampion.ratingCount > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 mt-3">
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold mb-2">
                        Community Peer Rubric Scores
                      </div>
                      <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                            <span>Code</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {overallChampion.ratingBreakdown.codeQuality?.toFixed(1) || "5.0"}★
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-slate-900 dark:bg-white rounded-full"
                              style={{
                                width: `${((overallChampion.ratingBreakdown.codeQuality || 5) / 5) * 100}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                            <span>Perf</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {overallChampion.ratingBreakdown.performance?.toFixed(1) || "5.0"}★
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${((overallChampion.ratingBreakdown.performance || 5) / 5) * 100}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                            <span>UX</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              {overallChampion.ratingBreakdown.design?.toFixed(1) || "5.0"}★
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{
                                width: `${((overallChampion.ratingBreakdown.design || 5) / 5) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tech Stack Chips */}
                  {overallChampion.techStack && overallChampion.techStack.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-3">
                      {overallChampion.techStack.slice(0, 5).map((tech) => (
                        <span
                          key={tech}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                        >
                          {tech}
                        </span>
                      ))}
                      {overallChampion.techStack.length > 5 && (
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          +{overallChampion.techStack.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Author & Upvote Counter */}
                <div className="pt-4 mt-3 border-t border-slate-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Author Line */}
                  <div className="flex items-center gap-2">
                    <img
                      src={getOptimizedImageUrl(overallChampion.author.avatar, 64, 75)}
                      alt={overallChampion.author.name}
                      onError={onAvatarError}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 dark:border-zinc-700 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                          {overallChampion.author.name}
                        </span>
                        {overallChampion.author.isVerified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        @{overallChampion.author.username || overallChampion.author.name}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Metrics */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Upvote Button / Counter */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-950/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-mono text-xs">
                      <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
                      <span className="font-bold tabular-nums">
                        {formatNumber(getDisplayUpvotes(overallChampion, timeHorizon))} upvotes
                      </span>
                    </div>

                    {/* Comments */}
                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-slate-300 font-mono text-xs">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="tabular-nums">{overallChampion.commentsCount}</span>
                    </div>

                    {/* Inspect Button */}
                    <button
                      type="button"
                      onClick={() => onSelectPortfolio(overallChampion)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <span>Inspect Architecture</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Runners-up Podium (Ranks 2 & 3) */}
            {overallRunnersUp.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {overallRunnersUp.map((runner, rIdx) => {
                  const rankNum = rIdx + 2;
                  const runnerVotes = getDisplayUpvotes(runner, timeHorizon);

                  return (
                    <button
                      key={runner.id}
                      type="button"
                      onClick={() => onSelectPortfolio(runner)}
                      className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121215] hover:border-slate-300 dark:hover:border-white/20 transition-all text-left cursor-pointer group"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0",
                          rankNum === 2
                            ? "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40"
                        )}
                      >
                        #{rankNum}
                      </div>

                      <img
                        src={getOptimizedImageUrl(runner.thumbnail, 64, 75)}
                        alt={runner.title}
                        onError={onImgError}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-zinc-800 shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {runner.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1">
                          by {runner.author.name}
                        </p>
                        <span
                          className={cn(
                            "text-[9px] font-mono px-1.5 py-0.5 rounded border inline-block",
                            getCategoryColor(runner.category)
                          )}
                        >
                          {runner.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-xs text-rose-600 dark:text-rose-400 shrink-0 font-bold">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
                        <span className="tabular-nums">{formatNumber(runnerVotes)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. CATEGORY DOMAIN SELECTOR (Identical to DiscoverApps GooeyNav)            */}
        {/* ========================================================================= */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-mono font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>Category Domains</span>
            </span>
            <span suppressHydrationWarning className="text-xs font-mono text-slate-400 dark:text-slate-500">
              {activeCategoryPortfolios.length}{" "}
              {activeCategoryPortfolios.length === 1 ? "portfolio" : "portfolios"}
            </span>
          </div>

          {/* Gooey Navigation Bar — exact same design as DiscoverApps */}
          <div className="overflow-x-auto pb-2 scrollbar-none no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <GooeyNav
              items={gooeyNavItems}
              value={activeCategoryIndex}
              onChange={(index) => {
                const targetCat = DOMAIN_CATEGORIES[index];
                if (targetCat) {
                  handleCategoryChange(targetCat.value);
                }
              }}
              size="sm"
              activeColor="#0f172a"
              activeLabelColor="#ffffff"
              className="p-1 rounded-xl bg-slate-100/90 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 shadow-2xs"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. CONTENT SECTIONS: ALL DOMAINS (Per-Domain Leaders) vs SPECIFIC DOMAIN   */}
        {/* ========================================================================= */}
        {activeCategory === "All" ? (
          /* ======================================================================= */
          /* ALL DOMAINS: Show Most Upvoted Portfolio by Each Domain                 */
          /* ======================================================================= */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Leading Portfolios by Domain
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Top-voted developer architecture representing each individual domain category.
                </p>
              </div>
            </div>

            {/* Grid of Domain Leader Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from(domainLeadingMap.entries()).map(([domainKey, domainData]) => {
                const leader = domainData.leader;
                const domainCount = domainData.count;
                const leaderVotes = leader ? getDisplayUpvotes(leader, timeHorizon) : 0;

                return (
                  <div
                    key={domainKey}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121215] p-4 shadow-xs hover:border-slate-300 dark:hover:border-white/20 transition-all"
                  >
                    <div>
                      {/* Domain Header */}
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-white/10">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-xs font-mono font-bold px-2 py-0.5 rounded-md border",
                              getCategoryColor(domainKey)
                            )}
                          >
                            {domainKey}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {domainCount} {domainCount === 1 ? "entry" : "entries"}
                        </span>
                      </div>

                      {/* Domain Leader Showcase */}
                      {leader ? (
                        <div
                          onClick={() => onSelectPortfolio(leader)}
                          className="cursor-pointer group"
                        >
                          {/* Thumbnail */}
                          <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-800 mb-3">
                            <img
                              src={getOptimizedImageUrl(leader.thumbnail, 400, 75)}
                              alt={leader.title}
                              loading="lazy"
                              decoding="async"
                              onError={onImgError}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/90 text-white font-mono text-[10px] font-bold">
                              #1 in {domainKey}
                            </div>
                          </div>

                          {/* Title & Author */}
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
                            {leader.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2.5">
                            {leader.tagline}
                          </p>

                          {/* Author row */}
                          <div className="flex items-center gap-1.5 mb-3">
                            <img
                              src={getOptimizedImageUrl(leader.author.avatar, 32, 75)}
                              alt={leader.author.name}
                              onError={onAvatarError}
                              className="w-4 h-4 rounded-full object-cover border border-slate-200 dark:border-zinc-700 shrink-0"
                            />
                            <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate">
                              {leader.author.name}
                            </span>
                            {leader.author.isVerified && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <Trophy className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            No submissions in this domain yet.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row */}
                    <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                      {leader ? (
                        <div className="flex items-center gap-1 font-mono text-xs text-rose-600 dark:text-rose-400 font-bold">
                          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
                          <span className="tabular-nums">{formatNumber(leaderVotes)} upvotes</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          Be the first
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCategoryChange(domainKey)}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>View rankings</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ======================================================================= */
          /* SPECIFIC DOMAIN: Show Ranked List for Selected Domain                   */
          /* ======================================================================= */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {activeCategory} Leaderboard
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  All developer portfolios in {activeCategory} ranked by community upvotes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCategoryChange("All")}
                className="text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-2xs"
              >
                ← Back to All Domains
              </button>
            </div>

            {activeCategoryPortfolios.length > 0 ? (
              <div className="space-y-2.5">
                {activeCategoryPortfolios.map((portfolio, idx) => {
                  const rank = idx + 1;
                  return (
                    <LeaderboardRankRow
                      key={portfolio.id}
                      portfolio={portfolio}
                      rank={rank}
                      timeHorizon={timeHorizon}
                      onSelect={onSelectPortfolio}
                      onLikeToggle={onLikeToggle}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121215]">
                <Trophy className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  No portfolios in {activeCategory} yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                  Be the first developer to showcase an architecture in the {activeCategory} domain and claim the #1 spot!
                </p>
                <button
                  type="button"
                  onClick={() => handleCategoryChange("All")}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Explore Other Domains
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* =================================================================================== */
/* RANK ROW COMPONENT FOR DOMAIN LEADERBOARD                                           */
/* =================================================================================== */

interface LeaderboardRankRowProps {
  portfolio: Portfolio;
  rank: number;
  timeHorizon: TimeHorizonTab;
  onSelect: (portfolio: Portfolio) => void;
  onLikeToggle?: (id: string, liked: boolean) => void;
}

function LeaderboardRankRow({
  portfolio,
  rank,
  timeHorizon,
  onSelect,
}: LeaderboardRankRowProps) {
  const displayVotes = getDisplayUpvotes(portfolio, timeHorizon);

  return (
    <div
      onClick={() => onSelect(portfolio)}
      className={cn(
        "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all text-left cursor-pointer hover:shadow-sm group",
        rank === 1 && "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50",
        rank === 2 && "bg-slate-50/70 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800",
        rank === 3 && "bg-amber-50/20 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/30",
        rank > 3 && "bg-white dark:bg-[#121215] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
      )}
    >
      {/* Rank Badge */}
      <div
        className={cn(
          "shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-black font-mono tabular-nums",
          rank === 1 && "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700",
          rank === 2 && "bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-300",
          rank === 3 && "bg-amber-100/60 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40",
          rank > 3 && "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400"
        )}
      >
        {rank}
      </div>

      {/* Thumbnail */}
      <img
        src={getOptimizedImageUrl(portfolio.thumbnail, 64, 75)}
        alt={portfolio.title}
        onError={onImgError}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-slate-200 dark:border-zinc-800 shrink-0"
      />

      {/* Title & Author Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
            {portfolio.title}
          </h4>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <img
              src={getOptimizedImageUrl(portfolio.author.avatar, 32, 75)}
              alt={portfolio.author.name}
              onError={onAvatarError}
              className="w-3.5 h-3.5 rounded-full object-cover border border-slate-200 dark:border-zinc-700 shrink-0"
            />
            <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
              {portfolio.author.name}
            </span>
            {portfolio.author.isVerified && (
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            )}
          </div>

          <span
            className={cn(
              "hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0",
              getCategoryColor(portfolio.category)
            )}
          >
            {portfolio.category}
          </span>
        </div>
      </div>

      {/* Stats Section (Right Side) */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Upvotes Counter */}
        <div className="flex items-center gap-1 text-xs sm:text-sm font-mono font-bold text-rose-600 dark:text-rose-400">
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
          <span className="tabular-nums">{formatNumber(displayVotes)}</span>
        </div>

        {/* Rating */}
        {portfolio.ratingCount > 0 && (
          <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-slate-700 dark:text-slate-300">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
            <span className="tabular-nums font-medium">{formatRating(portfolio.rating)}</span>
          </div>
        )}

        {/* Comments Count */}
        <div className="hidden md:flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400">
          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="tabular-nums">{portfolio.commentsCount}</span>
        </div>

        {/* Action arrow */}
        <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors shrink-0" />
      </div>
    </div>
  );
}
