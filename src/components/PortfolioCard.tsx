"use client";

import React, { useState, useEffect } from "react";
import { 
  Heart, 
  MessageSquare, 
  Star, 
  Award, 
  Flame, 
  CheckCircle2, 
  ArrowUpRight 
} from "@/components/ui/icons";
import { Portfolio } from "@/types/portfolio";
import { cn, formatNumber, formatRating, getOptimizedImageUrl } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { EmojiReaction } from "@/components/ui/emoji-reaction";
import { getEmojiDisplay } from "@/lib/emoji-utils";
import { GithubVerifiedPill } from "@/components/GithubVerifiedBadge";

export interface PortfolioCardProps {
  portfolio: Portfolio;
  onSelect: (portfolio: Portfolio) => void;
  onLikeToggle?: (id: string, liked: boolean) => void;
  onReact?: (id: string, emojiName: string) => void;
  currentUser?: any;
  viewMode?: "grid" | "list" | "mosaic";
  index?: number;
}

const FALLBACK_THUMBNAIL = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'><rect width='800' height='450' fill='%2318181b'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='22' fill='%2371717a'>Preview Unavailable</text></svg>";
const FALLBACK_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%2327272a'/><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32' fill='%23a1a1aa'>DEV</text></svg>";

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

export function PortfolioCard({
  portfolio,
  onSelect,
  onLikeToggle,
  onReact,
  currentUser,
  viewMode = "mosaic",
  index = 0,
}: PortfolioCardProps) {
  const [isLiked, setIsLiked] = useState<boolean>(portfolio.isLiked || false);
  const [likesCount, setLikesCount] = useState<number>(portfolio.likesCount);

  // Sync internal state when parent props change
  useEffect(() => {
    setIsLiked(portfolio.isLiked || false);
    setLikesCount(portfolio.likesCount);
  }, [portfolio.isLiked, portfolio.likesCount]);

  const isOwnPortfolio = Boolean(
    currentUser?.username &&
    portfolio.author?.username &&
    currentUser.username.toLowerCase() === portfolio.author.username.toLowerCase()
  );

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOwnPortfolio) {
      // Do not touch local like state for an owner's own portfolio — forward
      // to onLikeToggle so the shared handler's server-backed ownership check
      // (and its toast) is the single source of truth for this rejection.
      onLikeToggle?.(portfolio.id, !isLiked);
      return;
    }
    const nextState = !isLiked;
    setIsLiked(nextState);
    const nextCount = nextState ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLikesCount(nextCount);
    trackEvent("portfolio_like", { portfolioId: portfolio.id, liked: nextState });
    if (onLikeToggle) {
      onLikeToggle(portfolio.id, nextState);
    }
  };

  const handleReact = (emojiName: string) => {
    if (isOwnPortfolio) {
      // Do not touch local reaction/like state for an owner's own portfolio —
      // forward to onReact/onLikeToggle so the shared handler's server-backed
      // ownership check (and its toast) is the single source of truth.
      if (onReact) {
        onReact(portfolio.id, emojiName);
      } else {
        onLikeToggle?.(portfolio.id, true);
      }
      return;
    }
    if (onReact) {
      onReact(portfolio.id, emojiName);
    } else {
      if (!isLiked) {
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
      if (onLikeToggle) {
        onLikeToggle(portfolio.id, true);
      }
    }
    trackEvent("portfolio_reaction", { portfolioId: portfolio.id, reaction: emojiName });
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Developer":
        return "text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40";
      case "Arts":
        return "text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40";
      case "Client":
        return "text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/40";
      case "Systems":
        return "text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40";
      case "Design Engineer":
        return "text-pink-800 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800/40";
      case "Frontend":
        return "text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/40";
      case "Fullstack":
        return "text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40";
      case "AI / ML":
        return "text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40";
      default:
        return "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10";
    }
  };

  // 1. STREAMLINED LIST / ROW VIEW
  if (viewMode === "list") {
    return (
      <article
        onClick={() => onSelect(portfolio)}
        className="group relative flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-lg bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 cursor-pointer gap-4 transition-colors"
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {/* Thumbnail */}
          <div className="relative w-20 h-14 rounded-md overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10">
            <img
              src={getOptimizedImageUrl(portfolio.thumbnail, 200, 75)}
              alt={portfolio.title}
              loading="lazy"
              decoding="async"
              onError={onImgError}
              className="w-full h-full object-cover transition-opacity group-hover:opacity-95"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn("text-[11px] font-mono px-2 py-0.5 rounded-md border", getCategoryColor(portfolio.category))}>
                {portfolio.category}
              </span>
              {portfolio.showcaseType === "daily" && (
                <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-md">
                  <Flame className="w-3 h-3 text-amber-500" /> Daily Pick
                </span>
              )}
              {portfolio.showcaseType === "weekly" && (
                <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-md">
                  <Award className="w-3 h-3 text-amber-600" /> Weekly Pick
                </span>
              )}
              {portfolio.requestCritique && (
                <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/40 px-2 py-0.5 rounded-md shadow-xs">
                  <Flame className="w-3 h-3 text-orange-600 dark:text-orange-400" /> Roast Welcome
                </span>
              )}
              <GithubVerifiedPill verification={portfolio.githubVerification} />
            </div>

            <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:underline truncate">{portfolio.title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xl">{portfolio.tagline}</p>
          </div>
        </div>

        {/* Right Details */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Tech Stack */}
          <div className="hidden lg:flex items-center gap-1">
            {portfolio.techStack.slice(0, 3).map((tech) => (
              <span key={tech} className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[11px] border border-slate-200 dark:border-white/10">
                {tech}
              </span>
            ))}
          </div>

          {/* Author */}
          <div className="flex items-center gap-1.5">
            <img
              src={portfolio.author.avatar}
              alt={portfolio.author.name}
              onError={onAvatarError}
              className="w-4 h-4 rounded object-cover border border-slate-200 dark:border-white/10"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">{portfolio.author.name}</span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 text-xs font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-md border border-slate-200 dark:border-white/10">
            {portfolio.ratingCount > 0 ? (
              <>
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span className="font-semibold tabular-nums">{formatRating(portfolio.rating)}</span>
              </>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">No ratings yet</span>
            )}
          </div>

          {/* Like / Reactions */}
          <div onClick={(e) => e.stopPropagation()} className="relative inline-flex items-center">
            {isOwnPortfolio ? (
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="You can't react to your own portfolio."
                aria-label="You can't react to your own portfolio."
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border font-mono bg-white dark:bg-[#18181b] border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed"
              >
                <span className="text-sm">{getEmojiDisplay(portfolio.userReaction || "star-struck")}</span>
                {likesCount > 0 && <span className="tabular-nums font-semibold">{likesCount}</span>}
              </button>
            ) : (
              <EmojiReaction
                size="sm"
                align="right"
                asChild
                onReact={handleReact}
              >
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer font-mono",
                    isLiked
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 font-semibold shadow-xs"
                      : "bg-white dark:bg-[#18181b] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
                  )}
                  aria-label="React to architecture"
                >
                  <span className="text-sm">{getEmojiDisplay(portfolio.userReaction || "star-struck")}</span>
                  {likesCount > 0 && <span className="tabular-nums font-semibold">{likesCount}</span>}
                </button>
              </EmojiReaction>
            )}
          </div>

          {/* Comments */}
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-md border border-slate-200 dark:border-white/10">
            <MessageSquare className="w-3 h-3 text-slate-400" />
            <span className="tabular-nums">{portfolio.commentsCount}</span>
          </div>

          {/* Inspect Arrow */}
          <div className="p-1 text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </article>
    );
  }

  // 2. EDITORIAL MOSAIC (Featured Item)
  const isFeaturedInMosaic = viewMode === "mosaic" && (portfolio.isShowcase || index === 0);

  if (isFeaturedInMosaic) {
    return (
      <article
        onClick={() => onSelect(portfolio)}
        className="col-span-1 md:col-span-2 lg:col-span-3 bg-white dark:bg-[#121215] rounded-xl p-5 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 cursor-pointer group transition-colors relative"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Visual Column */}
          <div className="lg:col-span-7 relative aspect-[16/9] rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900">
            <img
              src={getOptimizedImageUrl(portfolio.thumbnail, 700, 75)}
              alt={portfolio.title}
              loading="lazy"
              decoding="async"
              onError={onImgError}
              className="w-full h-full object-cover transition-opacity group-hover:opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
              <span className={cn("text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border", getCategoryColor(portfolio.category))}>
                {portfolio.category}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-slate-900 dark:text-white bg-white/90 dark:bg-[#18181b]/90 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-md backdrop-blur-xs">
                Featured Blueprint
              </span>
              {portfolio.requestCritique && (
                <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/40 px-2 py-0.5 rounded-md shadow-xs">
                  <Flame className="w-3 h-3 text-orange-600 dark:text-orange-400" /> Roast Welcome
                </span>
              )}
              <GithubVerifiedPill verification={portfolio.githubVerification} />
            </div>

            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-white/95 dark:bg-[#18181b]/95 px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white backdrop-blur-xs">
              <img
                src={getOptimizedImageUrl(portfolio.author.avatar, 64, 75)}
                alt={portfolio.author.name}
                onError={onAvatarError}
                className="w-4 h-4 rounded object-cover"
              />
              <span className="text-xs text-slate-900 dark:text-white font-medium">{portfolio.author.name}</span>
              {portfolio.author.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
            </div>
          </div>

          {/* Details Column */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">
                  Verified Blueprint
                </span>
                <div className="flex items-center gap-1 text-xs font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                  {portfolio.ratingCount > 0 ? (
                    <>
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span className="font-bold">{formatRating(portfolio.rating)}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px]">({portfolio.ratingCount} reviews)</span>
                    </>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">No ratings yet</span>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {portfolio.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                {portfolio.tagline}
              </p>
            </div>

            {/* Rubric mini summary */}
            {portfolio.ratingBreakdown && portfolio.ratingCount > 0 && (
              <div className="grid grid-cols-4 gap-2 py-2.5 border-y border-slate-100 dark:border-white/10 text-center font-mono text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Code</div>
                  <div className="font-bold text-slate-900 dark:text-white">{portfolio.ratingBreakdown.codeQuality.toFixed(1)}★</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Perf</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">{portfolio.ratingBreakdown.performance.toFixed(1)}★</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">UX</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400">{portfolio.ratingBreakdown.design.toFixed(1)}★</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Doc</div>
                  <div className="font-bold text-sky-600 dark:text-sky-400">{portfolio.ratingBreakdown.documentation.toFixed(1)}★</div>
                </div>
              </div>
            )}

            {/* Tech stack & Action */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-wrap gap-1.5">
                {portfolio.techStack.slice(0, 4).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-white/5 text-[11px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div onClick={(e) => e.stopPropagation()} className="relative inline-flex items-center">
                  {isOwnPortfolio ? (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="You can't react to your own portfolio."
                      aria-label="You can't react to your own portfolio."
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border font-mono bg-white dark:bg-[#18181b] border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed"
                    >
                      <span className="text-sm">{getEmojiDisplay(portfolio.userReaction || "star-struck")}</span>
                      {likesCount > 0 && <span className="tabular-nums font-semibold">{likesCount}</span>}
                    </button>
                  ) : (
                    <EmojiReaction
                      size="sm"
                      align="right"
                      asChild
                      onReact={handleReact}
                    >
                      <button
                        type="button"
                        className={cn(
                          "flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer font-mono",
                          isLiked
                            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 font-semibold shadow-xs"
                            : "bg-white dark:bg-[#18181b] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10"
                        )}
                        aria-label="React to architecture"
                      >
                        <span className="text-sm">{getEmojiDisplay(portfolio.userReaction || "star-struck")}</span>
                        {likesCount > 0 && <span className="tabular-nums font-semibold">{likesCount}</span>}
                      </button>
                    </EmojiReaction>
                  )}
                </div>

                <span className="p-1.5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-medium hover:bg-black dark:hover:bg-slate-100 transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

          </div>
        </div>
      </article>
    );
  }

  // 3. STANDARD GRID CARD
  return (
    <article
      onClick={() => onSelect(portfolio)}
      className="group relative flex flex-col rounded-xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-colors cursor-pointer"
    >
      {/* Card Header Media */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-xl bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-white/10">
        <img
          src={getOptimizedImageUrl(portfolio.thumbnail, 480, 75)}
          alt={portfolio.title}
          loading="lazy"
          decoding="async"
          onError={onImgError}
          className="w-full h-full object-cover transition-opacity group-hover:opacity-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
          <span className={cn("text-[10px] font-mono font-medium px-2 py-0.5 rounded-md", getCategoryColor(portfolio.category))}>
            {portfolio.category}
          </span>
          {portfolio.showcaseType === "daily" && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-slate-900 dark:text-white bg-white/90 dark:bg-[#18181b]/90 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-md backdrop-blur-xs">
              <Flame className="w-3 h-3 text-amber-500" /> Daily
            </span>
          )}
          {portfolio.showcaseType === "weekly" && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-slate-900 dark:text-white bg-white/90 dark:bg-[#18181b]/90 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-md backdrop-blur-xs">
              <Award className="w-3 h-3 text-amber-600" /> Weekly
            </span>
          )}
          {portfolio.requestCritique && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/40 px-2 py-0.5 rounded-md shadow-xs">
              <Flame className="w-3 h-3 text-orange-600 dark:text-orange-400" /> Roast Welcome
            </span>
          )}
          <GithubVerifiedPill verification={portfolio.githubVerification} />
        </div>

        {/* Author Badge */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-white/95 dark:bg-[#18181b]/95 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white backdrop-blur-xs">
          <img
            src={getOptimizedImageUrl(portfolio.author.avatar, 48, 75)}
            alt={portfolio.author.name}
            onError={onAvatarError}
            className="w-3.5 h-3.5 rounded object-cover"
          />
          <span className="text-[11px] font-medium text-slate-900 dark:text-white truncate max-w-[110px]">
            {portfolio.author.name}
          </span>
          {portfolio.author.isVerified && (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          )}
          {portfolio.author.availableForHire && (
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"
              title="Available for Hire"
            />
          )}
        </div>

        {/* Inspect icon */}
        <div className="absolute bottom-2.5 right-2.5 p-1 rounded-md bg-white/95 dark:bg-[#18181b]/95 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors backdrop-blur-xs">
          <ArrowUpRight className="w-3 h-3" />
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-4">
        <div className="mb-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
            {portfolio.title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {portfolio.tagline}
          </p>
        </div>

        {/* Tech Stack Chips */}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-2.5">
          {portfolio.techStack.slice(0, 3).map((tech) => (
            <span
              key={tech}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {tech}
            </span>
          ))}
          {portfolio.techStack.length > 3 && (
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 px-1">
              +{portfolio.techStack.length - 3}
            </span>
          )}
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-white/10">
          {/* Rating Badge */}
          <div className="flex items-center gap-1 text-xs font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
            {portfolio.ratingCount > 0 ? (
              <>
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span className="font-semibold tabular-nums">{formatRating(portfolio.rating)}</span>
                <span className="text-slate-400 dark:text-slate-500 text-[10px] tabular-nums">({portfolio.ratingCount})</span>
              </>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">No ratings yet</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Likes / Reactions */}
            <div onClick={(e) => e.stopPropagation()} className="relative inline-flex items-center">
              {isOwnPortfolio ? (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="You can't react to your own portfolio."
                  aria-label="You can't react to your own portfolio."
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border font-mono bg-white dark:bg-[#18181b] border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed"
                >
                  <span className="text-sm">{getEmojiDisplay(portfolio.userReaction || "star-struck")}</span>
                  {likesCount > 0 && <span className="text-[11px] tabular-nums font-semibold">{formatNumber(likesCount)}</span>}
                </button>
              ) : (
                <EmojiReaction
                  size="sm"
                  align="right"
                  asChild
                  onReact={handleReact}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border transition-colors cursor-pointer font-mono",
                      isLiked
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 font-semibold shadow-xs"
                        : "bg-white dark:bg-[#18181b] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10"
                    )}
                    aria-label="React to architecture"
                  >
                    <span className="text-sm">{getEmojiDisplay(portfolio.userReaction || "star-struck")}</span>
                    {likesCount > 0 && <span className="text-[11px] tabular-nums font-semibold">{formatNumber(likesCount)}</span>}
                  </button>
                </EmojiReaction>
              )}
            </div>

            {/* Comments */}
            <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
              <MessageSquare className="w-3 h-3 text-slate-400" />
              <span className="text-[11px] tabular-nums">{portfolio.commentsCount}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
