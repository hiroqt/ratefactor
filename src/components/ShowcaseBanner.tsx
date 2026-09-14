"use client";

import React, { useState, useMemo } from "react";
import { 
  Award, 
  Flame, 
  Star, 
  ArrowUpRight, 
  ChevronUp, 
  MessageSquare, 
  CheckCircle2, 
  Search, 
  X, 
  User, 
  ArrowRight 
} from "@/components/ui/icons";
import { Portfolio, PortfolioCategory } from "@/types/portfolio";
import { DeveloperProfile } from "@/types/profile";
import { formatRating, formatNumber, timeAgo, getOptimizedImageUrl } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { getEmojiDisplay } from "@/lib/emoji-utils";
import { createProfileFromAuthor } from "@/lib/profile-utils";

interface ShowcaseBannerProps {
  portfolios?: Portfolio[];
  allPortfolios?: Portfolio[];
  dailyShowcase?: Portfolio | null;
  weeklyShowcase?: Portfolio | null;
  onSelectPortfolio: (p: Portfolio) => void;
  onLikeToggle?: (portfolioId: string, isLiked: boolean) => void;
  onTriggerAlgorithm?: (type: "daily" | "weekly") => void;
  onCategorySelect?: (category: PortfolioCategory) => void;
  isCompact?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onVisitUser?: (userProfile: DeveloperProfile) => void;
  baseProfile?: DeveloperProfile;
}

export function ShowcaseBanner({
  portfolios = [],
  allPortfolios,
  dailyShowcase,
  weeklyShowcase,
  onSelectPortfolio,
  onLikeToggle,
  onTriggerAlgorithm,
  onCategorySelect,
  isCompact = false,
  searchQuery = "",
  onSearchQueryChange,
  onVisitUser,
  baseProfile,
}: ShowcaseBannerProps) {
  const [activeSpotlightTab, setActiveSpotlightTab] = useState<"daily" | "weekly">("daily");
  const [boardTab, setBoardTab] = useState<"today" | "week" | "all">("today");

  const matchedUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const source = allPortfolios && allPortfolios.length > 0 ? allPortfolios : portfolios;
    const authorMap = new Map<string, { author: Portfolio["author"]; count: number }>();
    source.forEach((p) => {
      const username = p.author?.username || p.author?.name;
      if (!username) return;
      const key = username.toLowerCase();
      if (authorMap.has(key)) {
        authorMap.get(key)!.count += 1;
      } else {
        authorMap.set(key, { author: p.author, count: 1 });
      }
    });

    const results: { author: Portfolio["author"]; count: number; profile: DeveloperProfile }[] = [];
    authorMap.forEach(({ author, count }) => {
      const authorName = (author.name || "").toLowerCase();
      const authorUser = (author.username || "").toLowerCase();
      const authorRole = (author.role || "").toLowerCase();
      if (authorName.includes(q) || authorUser.includes(q) || authorRole.includes(q)) {
        results.push({
          author,
          count,
          profile: createProfileFromAuthor(author, source, baseProfile),
        });
      }
    });
    return results;
  }, [searchQuery, allPortfolios, portfolios, baseProfile]);

  const currentShowcase = activeSpotlightTab === "daily" 
    ? dailyShowcase || weeklyShowcase || portfolios[0] || null
    : weeklyShowcase || dailyShowcase || portfolios[0] || null;

  const leaderboardItems = useMemo(() => {
    if (!portfolios || portfolios.length === 0) return [];
    const pool = [...portfolios];

    if (boardTab === "today") {
      return pool
        .sort((a, b) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.likesCount - a.likesCount;
        })
        .slice(0, 5);
    }

    if (boardTab === "week") {
      return pool
        .sort((a, b) => {
          const aScore = a.rating * 10 + a.likesCount * 2 + a.commentsCount;
          const bScore = b.rating * 10 + b.likesCount * 2 + b.commentsCount;
          return bScore - aScore;
        })
        .slice(0, 5);
    }

    return pool
      .sort((a, b) => b.likesCount - a.likesCount)
      .slice(0, 5);
  }, [portfolios, boardTab]);

  const latestSubmissions = useMemo(() => {
    if (!portfolios || portfolios.length === 0) return [];
    return [...portfolios]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
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

        {/* Section Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Showcase &amp; Leaderboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Peer-evaluated developer architectures, top-voted projects, and latest submissions.
            </p>
          </div>

          {/* Quick Search Bar */}
          {onSearchQueryChange && (
            <div className="relative w-full md:w-80 lg:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search domain, author (@username), title..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 focus:border-slate-400 dark:focus:border-white/20 shadow-xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search Filter Indicator */}
        {searchQuery.trim() && (
          <div className="mb-4 p-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-700 dark:text-slate-300">
              Showing matching architectures for <strong className="text-slate-900 dark:text-white font-semibold">"{searchQuery}"</strong> ({portfolios.length} found)
            </span>
            <button
              type="button"
              onClick={() => onSearchQueryChange?.("")}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-mono underline cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}

        {/* Matched Developers Banner (When searching) */}
        {searchQuery.trim() && matchedUsers.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/10 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                  Matched Developers ({matchedUsers.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Click Visit to view public developer profile
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {matchedUsers.map(({ author, count, profile: devProfile }) => (
                <div
                  key={author.username || author.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <img
                      src={getOptimizedImageUrl(author.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80", 72, 75)}
                      alt={author.name}
                      loading="lazy"
                      decoding="async"
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {author.name}
                        </span>
                        {author.isVerified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                        @{author.username?.replace(/^@/, "")}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {count} {count === 1 ? "architecture" : "architectures"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onVisitUser?.(devProfile)}
                    className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Visit</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {portfolios.length === 0 ? (
          <div className="bg-white dark:bg-[#121215] rounded-2xl p-8 sm:p-12 border border-dashed border-slate-200 dark:border-white/10 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto text-slate-400 mb-4">
              <Award className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              No developer portfolios indexed yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
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
              <article className="lg:col-span-7 bg-white dark:bg-[#121215] rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 shadow-xs flex flex-col justify-between">
              
              {/* Card Header & Stage Switcher */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">
                    {activeSpotlightTab === "daily" ? "Daily Spotlight" : "Weekly Champion"}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                    {currentShowcase.category}
                  </span>
                </div>

                <div className="flex items-center p-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-medium">
                  {dailyShowcase && (
                    <button
                      type="button"
                      onClick={() => setActiveSpotlightTab("daily")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        activeSpotlightTab === "daily"
                          ? "bg-white dark:bg-[#18181b] text-slate-900 dark:text-white shadow-xs font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                          ? "bg-white dark:bg-[#18181b] text-slate-900 dark:text-white shadow-xs font-semibold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                  className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 aspect-[16/9] bg-slate-100 dark:bg-slate-900 cursor-pointer group"
                >
                  <img
                    src={getOptimizedImageUrl(currentShowcase.thumbnail, 720, 80)}
                    alt={currentShowcase.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-opacity duration-150 group-hover:opacity-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Rating Badge */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-white/95 dark:bg-[#18181b]/95 border border-slate-200 dark:border-white/10 text-xs font-mono font-medium text-slate-900 dark:text-white flex items-center gap-1 backdrop-blur-xs">
                    {currentShowcase.ratingCount > 0 ? (
                      <>
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{formatRating(currentShowcase.rating)}</span>
                      </>
                    ) : (
                      <span>Unrated</span>
                    )}
                  </div>

                  {/* Bottom Author & CTA */}
                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-2.5 sm:left-2.5 sm:right-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-white/95 dark:bg-[#18181b]/95 px-2 sm:px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/10 min-w-0 max-w-[60%] sm:max-w-none backdrop-blur-xs">
                      <img
                        src={getOptimizedImageUrl(currentShowcase.author.avatar, 48, 75)}
                        alt={currentShowcase.author.name}
                        loading="lazy"
                        decoding="async"
                        className="w-4 h-4 rounded object-cover shrink-0"
                      />
                      <span className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {currentShowcase.author.name}
                      </span>
                      {currentShowcase.author.isVerified && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-medium text-xs hover:bg-black dark:hover:bg-slate-100 transition-colors shrink-0">
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
                    className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    {currentShowcase.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-2">
                    {currentShowcase.tagline}
                  </p>
                </div>

                {/* Showcase Review Reason */}
                {currentShowcase.showcaseReason && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-white">Reviewer Note: </span>
                    "{currentShowcase.showcaseReason}"
                  </div>
                )}

                {/* 3-Factor Rubric Progress Bars */}
                {currentShowcase.ratingBreakdown && currentShowcase.ratingCount > 0 && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold mb-2">
                      3-Factor Rubric Scores
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                          <span>Code</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {currentShowcase.ratingBreakdown.codeQuality.toFixed(1)}★
                          </span>
                        </div>
                        <div className="h-1.5 rounded bg-slate-200 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-slate-900 dark:bg-white rounded"
                            style={{ width: `${(currentShowcase.ratingBreakdown.codeQuality / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                          <span>Perf</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {currentShowcase.ratingBreakdown.performance.toFixed(1)}★
                          </span>
                        </div>
                        <div className="h-1.5 rounded bg-slate-200 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded"
                            style={{ width: `${(currentShowcase.ratingBreakdown.performance / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                          <span>UX</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {currentShowcase.ratingBreakdown.design.toFixed(1)}★
                          </span>
                        </div>
                        <div className="h-1.5 rounded bg-slate-200 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded"
                            style={{ width: `${(currentShowcase.ratingBreakdown.design / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Actions */}
              <div className="pt-4 mt-3 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {currentShowcase.techStack.slice(0, 4).map((tech) => (
                    <span 
                      key={tech}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleVote(e, currentShowcase)}
                    aria-label={`React to ${currentShowcase.title}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono font-medium transition-colors cursor-pointer ${
                      currentShowcase.isLiked
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 font-semibold shadow-xs"
                        : "bg-white dark:bg-[#18181b] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10"
                    }`}
                  >
                    <span className="text-sm">{getEmojiDisplay(currentShowcase.userReaction || "star-struck")}</span>
                    {currentShowcase.likesCount > 0 && <span>{formatNumber(currentShowcase.likesCount)}</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInspect(currentShowcase, "spotlight_comments")}
                    aria-label={`View comments on ${currentShowcase.title}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white dark:bg-[#18181b] hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
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
          <article className="lg:col-span-5 bg-white dark:bg-[#121215] rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 shadow-xs flex flex-col justify-between">
            
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-white/10">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Community Leaderboard
                </h3>

                {/* Range Tabs */}
                <div 
                  role="tablist" 
                  aria-label="Leaderboard time horizons"
                  className="flex items-center p-0.5 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs self-start sm:self-auto"
                >
                  <button
                    type="button"
                    role="tab"
                    id="tab-today"
                    aria-selected={boardTab === "today"}
                    onClick={() => setBoardTab("today")}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      boardTab === "today"
                        ? "bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-semibold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                        ? "bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-semibold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                        ? "bg-white dark:bg-[#18181b] text-slate-900 dark:text-white font-semibold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    All Time
                  </button>
                </div>
              </div>

              {/* Leaderboard Rows */}
              <div className="divide-y divide-slate-100 dark:divide-white/5 pt-1">
                {leaderboardItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                    No ranked developer architectures yet.
                  </div>
                ) : (
                  leaderboardItems.map((item, idx) => {
                  const rank = idx + 1;
                  const isGold = rank === 1;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleInspect(item, "leaderboard_row")}
                      className="flex items-center justify-between gap-2 sm:gap-3 py-2 sm:py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-md px-1 sm:px-1.5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                        <span 
                          className={`w-5 h-5 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                            isGold
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                              : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10"
                          }`}
                        >
                          {rank}
                        </span>

                        <img
                          src={getOptimizedImageUrl(item.thumbnail, 48, 65)}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-md object-cover border border-slate-200 dark:border-white/10 shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:underline truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {item.category} • {item.author.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 font-medium hidden sm:inline">
                          {item.ratingCount > 0 ? `★${formatRating(item.rating)}` : "Unrated"}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleVote(e, item)}
                          aria-label={`React to ${item.title}`}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono transition-colors cursor-pointer min-h-[28px] sm:min-h-0 ${
                            item.isLiked
                              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 font-semibold shadow-xs"
                              : "bg-white dark:bg-[#18181b] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                          }`}
                        >
                          <span className="text-xs">{getEmojiDisplay(item.userReaction || "star-struck")}</span>
                          {item.likesCount > 0 && <span>{formatNumber(item.likesCount)}</span>}
                        </button>
                      </div>
                    </div>
                  );
                }))}
              </div>
            </div>

          </article>

          {/* ========================================================================= */}
          {/* BENTO CARD 3: Fresh from Developers (12 Cols)                             */}
          {/* ========================================================================= */}
          <article className="lg:col-span-12 bg-white dark:bg-[#121215] rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 shadow-xs flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3 border-b border-slate-100 dark:border-white/10">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Fresh from Developers
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Recently submitted software architectures and developer codebases.
                </p>
              </div>
            </div>

            {/* Quad Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
              {latestSubmissions.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                  No developer submissions recorded yet.
                </div>
              ) : (
                latestSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => handleInspect(sub, "fresh_card")}
                  className="rounded-lg p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="relative rounded-md overflow-hidden aspect-[16/10] bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-white/10 mb-2.5">
                      <img
                        src={getOptimizedImageUrl(sub.thumbnail, 320, 65)}
                        alt={sub.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-opacity group-hover:opacity-95"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/95 dark:bg-[#18181b]/95 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10">
                        {sub.category}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {sub.title}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                      {sub.tagline}
                    </p>
                  </div>

                  <div className="pt-2.5 mt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{sub.author.name}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono shrink-0">{timeAgo(sub.createdAt)}</span>
                  </div>
                </div>
              )))}
            </div>
          </article>
        </div>
      )}

      </div>
    </section>
  );
}
