"use client";

import React, { useState, useMemo } from "react";
import { 
  Award, 
  Flame, 
  Star, 
  ArrowUpRight, 
  ChevronUp, 
  MessageSquare, 
  Clock, 
  CheckCircle2
} from "lucide-react";
import { Portfolio, PortfolioCategory } from "@/types/portfolio";
import { formatRating, formatNumber, timeAgo } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface ShowcaseBannerProps {
  portfolios?: Portfolio[];
  dailyShowcase?: Portfolio | null;
  weeklyShowcase?: Portfolio | null;
  onSelectPortfolio: (p: Portfolio) => void;
  onLikeToggle?: (portfolioId: string, isLiked: boolean) => void;
  onTriggerAlgorithm?: (type: "daily" | "weekly") => void;
  onCategorySelect?: (category: PortfolioCategory) => void;
  isCompact?: boolean;
}

export function ShowcaseBanner({
  portfolios = [],
  dailyShowcase,
  weeklyShowcase,
  onSelectPortfolio,
  onLikeToggle,
  onTriggerAlgorithm,
  onCategorySelect,
  isCompact = false,
}: ShowcaseBannerProps) {
  const [activeSpotlightTab, setActiveSpotlightTab] = useState<"daily" | "weekly">("daily");
  const [boardTab, setBoardTab] = useState<"today" | "week" | "all">("today");

  const currentShowcase = activeSpotlightTab === "daily" 
    ? dailyShowcase || weeklyShowcase 
    : weeklyShowcase || dailyShowcase;

  const leaderboardItems = useMemo(() => {
    if (!portfolios || portfolios.length === 0) return [];
    const pool = [...portfolios];

    if (boardTab === "today") {
      return pool
        .sort((a, b) => {
          const scoreA = a.rating * 20 + a.likesCount * 0.4 + (a.showcaseType === "daily" ? 30 : 0);
          const scoreB = b.rating * 20 + b.likesCount * 0.4 + (b.showcaseType === "daily" ? 30 : 0);
          return scoreB - scoreA;
        })
        .slice(0, 4);
    } else if (boardTab === "week") {
      return pool
        .sort((a, b) => {
          const scoreA = a.likesCount * 1.5 + a.ratingCount * 2 + (a.showcaseType === "weekly" ? 50 : 0);
          const scoreB = b.likesCount * 1.5 + b.ratingCount * 2 + (b.showcaseType === "weekly" ? 50 : 0);
          return scoreB - scoreA;
        })
        .slice(0, 4);
    } else {
      return pool
        .sort((a, b) => b.rating - a.rating || b.likesCount - a.likesCount)
        .slice(0, 4);
    }
  }, [portfolios, boardTab]);

  const latestSubmissions = useMemo(() => {
    if (!portfolios || portfolios.length === 0) return [];
    return [...portfolios]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [portfolios]);

  const totalUpvotes = useMemo(() => {
    return portfolios.reduce((acc, p) => acc + (p.likesCount || 0), 0);
  }, [portfolios]);

  const handleInspect = (p: Portfolio, origin: string) => {
    trackEvent("showcase_click", { portfolioId: p.id, origin });
    onSelectPortfolio(p);
  };

  const handleVote = (e: React.MouseEvent, p: Portfolio) => {
    e.stopPropagation();
    if (onLikeToggle) {
      onLikeToggle(p.id, !p.isLiked);
    }
  };

  return (
    <section id="showcase-bento" className="py-6 relative z-20">
      <div id="discovery-grid" className="-mt-20 pt-20" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Showcase &amp; Leaderboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Peer-evaluated developer architectures, top-voted projects, and latest submissions.
            </p>
          </div>
        </div>

        {portfolios.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 border border-dashed border-slate-200 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-4">
              <Award className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              No developer portfolios indexed yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
              Be the first to showcase your codebases, receive peer critiques across our 3-factor rubric, and compete for the Daily and Weekly Showcase!
            </p>
          </div>
        ) : (
          /* Bento Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* ========================================================================= */}
            {/* BENTO CARD 1: Featured Spotlight (7 Cols)                                 */}
            {/* ========================================================================= */}
            {currentShowcase && (
              <article className="lg:col-span-7 bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              
              {/* Card Header & Stage Switcher */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">
                    {activeSpotlightTab === "daily" ? "Daily Spotlight" : "Weekly Champion"}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                    {currentShowcase.category}
                  </span>
                </div>

                <div className="flex items-center p-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium">
                  {dailyShowcase && (
                    <button
                      type="button"
                      onClick={() => setActiveSpotlightTab("daily")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        activeSpotlightTab === "daily"
                          ? "bg-white text-slate-900 shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Flame className="w-3 h-3 text-amber-500" />
                      <span>Daily</span>
                    </button>
                  )}
                  {weeklyShowcase && (
                    <button
                      type="button"
                      onClick={() => setActiveSpotlightTab("weekly")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        activeSpotlightTab === "weekly"
                          ? "bg-white text-slate-900 shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Award className="w-3 h-3 text-amber-600" />
                      <span>Weekly</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Main Content */}
              <div className="pt-4 space-y-3.5">
                
                {/* Media Window */}
                <div 
                  onClick={() => handleInspect(currentShowcase, "spotlight_media")}
                  className="relative rounded-lg overflow-hidden border border-slate-200 aspect-[16/9] bg-slate-100 cursor-pointer group"
                >
                  <img
                    src={currentShowcase.thumbnail}
                    alt={currentShowcase.title}
                    className="w-full h-full object-cover transition-opacity duration-150 group-hover:opacity-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  {/* Rating Badge */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-white border border-slate-200 text-xs font-mono font-medium text-slate-900 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{formatRating(currentShowcase.rating)}</span>
                  </div>

                  {/* Bottom Author & CTA */}
                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-2.5 sm:left-2.5 sm:right-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-white px-2 sm:px-2.5 py-1 rounded-md border border-slate-200 min-w-0 max-w-[60%] sm:max-w-none">
                      <img
                        src={currentShowcase.author.avatar}
                        alt={currentShowcase.author.name}
                        className="w-4 h-4 rounded object-cover shrink-0"
                      />
                      <span className="text-xs font-medium text-slate-900 truncate">
                        {currentShowcase.author.name}
                      </span>
                      {currentShowcase.author.isVerified && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md bg-slate-900 text-white font-medium text-xs hover:bg-black transition-colors shrink-0">
                      <span className="hidden sm:inline">Inspect Architecture</span>
                      <span className="sm:hidden">Inspect</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Title & Tagline */}
                <div>
                  <h3 
                    onClick={() => handleInspect(currentShowcase, "spotlight_title")}
                    className="text-lg sm:text-xl font-bold text-slate-900 hover:text-black cursor-pointer"
                  >
                    {currentShowcase.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed line-clamp-2">
                    {currentShowcase.tagline}
                  </p>
                </div>

                {/* Showcase Review Reason */}
                {currentShowcase.showcaseReason && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900">Reviewer Note: </span>
                    "{currentShowcase.showcaseReason}"
                  </div>
                )}

                {/* 3-Factor Rubric Progress Bars */}
                {currentShowcase.ratingBreakdown && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-mono text-slate-500 font-semibold mb-2">
                      3-Factor Rubric Scores
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                          <span>Code</span>
                          <span className="font-bold text-slate-900">
                            {currentShowcase.ratingBreakdown.codeQuality?.toFixed(1) || "5.0"}★
                          </span>
                        </div>
                        <div className="h-1.5 rounded bg-slate-200 overflow-hidden">
                          <div 
                            className="h-full bg-slate-900 rounded" 
                            style={{ width: `${((currentShowcase.ratingBreakdown.codeQuality || 5) / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                          <span>Perf</span>
                          <span className="font-bold text-emerald-700">
                            {currentShowcase.ratingBreakdown.performance?.toFixed(1) || "5.0"}★
                          </span>
                        </div>
                        <div className="h-1.5 rounded bg-slate-200 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-600 rounded" 
                            style={{ width: `${((currentShowcase.ratingBreakdown.performance || 5) / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                          <span>UX</span>
                          <span className="font-bold text-amber-700">
                            {currentShowcase.ratingBreakdown.design?.toFixed(1) || "4.8"}★
                          </span>
                        </div>
                        <div className="h-1.5 rounded bg-slate-200 overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded" 
                            style={{ width: `${((currentShowcase.ratingBreakdown.design || 4.8) / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Actions */}
              <div className="pt-4 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {currentShowcase.techStack.slice(0, 4).map((tech) => (
                    <span 
                      key={tech}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleVote(e, currentShowcase)}
                    aria-label={`Upvote ${currentShowcase.title}`}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs font-mono font-medium transition-colors cursor-pointer ${
                      currentShowcase.isLiked
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>{formatNumber(currentShowcase.likesCount)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInspect(currentShowcase, "spotlight_comments")}
                    aria-label={`View comments on ${currentShowcase.title}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentShowcase.commentsCount}</span>
                  </button>
                </div>
              </div>

            </article>
          )}

          {/* ========================================================================= */}
          {/* BENTO CARD 2: Community Leaderboard (5 Cols)                              */}
          {/* ========================================================================= */}
          <article className="lg:col-span-5 bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">
                  Community Leaderboard
                </h3>

                {/* Range Tabs */}
                <div 
                  role="tablist" 
                  aria-label="Leaderboard time horizons"
                  className="flex items-center p-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs self-start sm:self-auto"
                >
                  <button
                    type="button"
                    role="tab"
                    id="tab-today"
                    aria-selected={boardTab === "today"}
                    onClick={() => setBoardTab("today")}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      boardTab === "today"
                        ? "bg-white text-slate-900 font-semibold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="tab-week"
                    aria-selected={boardTab === "week"}
                    onClick={() => setBoardTab("week")}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      boardTab === "week"
                        ? "bg-white text-slate-900 font-semibold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    This Week
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="tab-all"
                    aria-selected={boardTab === "all"}
                    onClick={() => setBoardTab("all")}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      boardTab === "all"
                        ? "bg-white text-slate-900 font-semibold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Time
                  </button>
                </div>
              </div>

              {/* Leaderboard Rows */}
              <div className="divide-y divide-slate-100 pt-1">
                {leaderboardItems.map((item, idx) => {
                  const rank = idx + 1;
                  const isGold = rank === 1;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleInspect(item, "leaderboard_row")}
                      className="flex items-center justify-between gap-2 sm:gap-3 py-2 sm:py-2.5 hover:bg-slate-50 rounded-md px-1 sm:px-1.5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                        <span 
                          className={`w-5 h-5 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                            isGold
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "text-slate-500 bg-slate-100"
                          }`}
                        >
                          {rank}
                        </span>

                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-md object-cover border border-slate-200 shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900 group-hover:underline truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.category} • {item.author.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-amber-800 font-medium hidden sm:inline">
                          ★{formatRating(item.rating)}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleVote(e, item)}
                          aria-label={`Upvote ${item.title}`}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono transition-colors cursor-pointer min-h-[28px] sm:min-h-0 ${
                            item.isLiked
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <ChevronUp className="w-3 h-3" />
                          <span>{formatNumber(item.likesCount)}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Meta */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>{formatNumber(totalUpvotes)} votes recorded</span>
              <span>Sorted by peer engagement</span>
            </div>

          </article>

          {/* ========================================================================= */}
          {/* BENTO CARD 3: Fresh from Developers (12 Cols)                             */}
          {/* ========================================================================= */}
          <article className="lg:col-span-12 bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Fresh from Developers
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recently submitted software architectures and developer codebases.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-1 sm:mt-0">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Latest index</span>
              </span>
            </div>

            {/* Quad Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
              {latestSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => handleInspect(sub, "fresh_card")}
                  className="rounded-lg p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="relative rounded-md overflow-hidden aspect-[16/10] bg-slate-200 border border-slate-200 mb-2.5">
                      <img
                        src={sub.thumbnail}
                        alt={sub.title}
                        className="w-full h-full object-cover transition-opacity group-hover:opacity-95"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white text-slate-800 border border-slate-200">
                        {sub.category}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-black transition-colors truncate">
                      {sub.title}
                    </h4>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                      {sub.tagline}
                    </p>
                  </div>

                  <div className="pt-2.5 mt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 font-medium truncate">{sub.author.name}</span>
                    <span className="text-slate-500 font-mono shrink-0">{timeAgo(sub.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Meta */}
            <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>{portfolios.length} architectures indexed</span>
              <span>100% Peer Reviewed Rubric</span>
            </div>
          </article>
        </div>
      )}

      </div>
    </section>
  );
}
