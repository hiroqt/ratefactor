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
} from "lucide-react";
import { Portfolio } from "@/types/portfolio";
import { cn, formatNumber, formatRating } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { EmojiReaction } from "@/components/ui/emoji-reaction";

export interface PortfolioCardProps {
  portfolio: Portfolio;
  onSelect: (portfolio: Portfolio) => void;
  onLikeToggle?: (id: string, liked: boolean) => void;
  viewMode?: "grid" | "list" | "mosaic";
  index?: number;
}

export function PortfolioCard({
  portfolio,
  onSelect,
  onLikeToggle,
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

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    if (!isLiked) {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
    }
    trackEvent("portfolio_reaction", { portfolioId: portfolio.id, reaction: emojiName });
    if (onLikeToggle) {
      onLikeToggle(portfolio.id, true);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Developer":
        return "text-indigo-800 bg-indigo-50 border-indigo-200";
      case "Arts":
        return "text-rose-800 bg-rose-50 border-rose-200";
      case "Client":
        return "text-teal-800 bg-teal-50 border-teal-200";
      case "Systems":
        return "text-amber-800 bg-amber-50 border-amber-200";
      case "Design Engineer":
        return "text-pink-800 bg-pink-50 border-pink-200";
      case "Frontend":
        return "text-sky-800 bg-sky-50 border-sky-200";
      case "Fullstack":
        return "text-emerald-800 bg-emerald-50 border-emerald-200";
      case "AI / ML":
        return "text-purple-800 bg-purple-50 border-purple-200";
      default:
        return "text-slate-700 bg-slate-100 border-slate-200";
    }
  };

  // 1. STREAMLINED LIST / ROW VIEW
  if (viewMode === "list") {
    return (
      <article
        onClick={() => onSelect(portfolio)}
        className="group relative flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer gap-4 transition-colors"
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {/* Thumbnail */}
          <div className="relative w-20 h-14 rounded-md overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
            <img
              src={portfolio.thumbnail}
              alt={portfolio.title}
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
                <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                  <Flame className="w-3 h-3 text-amber-500" /> Daily Pick
                </span>
              )}
              {portfolio.showcaseType === "weekly" && (
                <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                  <Award className="w-3 h-3 text-amber-600" /> Weekly Pick
                </span>
              )}
            </div>

            <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-black transition-colors truncate">
              {portfolio.title}
            </h3>
            <p className="text-xs text-slate-600 truncate max-w-xl">
              {portfolio.tagline}
            </p>
          </div>
        </div>

        {/* Right Details & Metrics */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          {/* Tech stack */}
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-xs">
            {portfolio.techStack.slice(0, 3).map((tech) => (
              <span key={tech} className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 text-[11px] border border-slate-200">
                {tech}
              </span>
            ))}
          </div>

          {/* Author */}
          <div className="flex items-center gap-1.5">
            <img
              src={portfolio.author.avatar}
              alt={portfolio.author.name}
              className="w-4 h-4 rounded object-cover border border-slate-200"
            />
            <span className="text-xs text-slate-600 hidden sm:inline">{portfolio.author.name}</span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 text-xs font-mono text-slate-900 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span className="font-semibold tabular-nums">{formatRating(portfolio.rating)}</span>
          </div>

          {/* Like / Reactions */}
          <div onClick={(e) => e.stopPropagation()} className="relative inline-flex items-center">
            <EmojiReaction
              size="sm"
              asChild
              onReact={handleReact}
            >
              <button
                type="button"
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer font-mono",
                  isLiked
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                )}
                aria-label="React or like portfolio"
              >
                <Heart className={cn("w-3 h-3", isLiked && "fill-rose-400 text-rose-400")} />
                <span className="tabular-nums">{likesCount}</span>
              </button>
            </EmojiReaction>
          </div>

          {/* Comments */}
          <div className="flex items-center gap-1 text-xs text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
            <MessageSquare className="w-3 h-3 text-slate-400" />
            <span className="tabular-nums">{portfolio.commentsCount}</span>
          </div>

          {/* Inspect Arrow */}
          <div className="p-1 text-slate-400 group-hover:text-slate-900 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </article>
    );
  }

  // 2. EDITORIAL MOSAIC (Featured Item without glass, specular lines, or fake sparkles)
  const isFeaturedInMosaic = viewMode === "mosaic" && (portfolio.isShowcase || index === 0);

  if (isFeaturedInMosaic) {
    return (
      <article
        onClick={() => onSelect(portfolio)}
        className="col-span-1 md:col-span-2 lg:col-span-3 bg-white rounded-xl p-5 border border-slate-200 hover:border-slate-300 cursor-pointer group transition-colors overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Visual Column */}
          <div className="lg:col-span-7 relative aspect-[16/9] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
            <img
              src={portfolio.thumbnail}
              alt={portfolio.title}
              className="w-full h-full object-cover transition-opacity group-hover:opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className={cn("text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border bg-white text-slate-900", getCategoryColor(portfolio.category))}>
                {portfolio.category}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                Featured Blueprint
              </span>
            </div>

            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-900">
              <img
                src={portfolio.author.avatar}
                alt={portfolio.author.name}
                className="w-4 h-4 rounded object-cover"
              />
              <span className="text-xs text-slate-900 font-medium">{portfolio.author.name}</span>
              {portfolio.author.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
          </div>

          {/* Details Column */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono text-slate-500 font-medium">
                  Verified Blueprint
                </span>
                <div className="flex items-center gap-1 text-xs font-mono text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span className="font-bold">{formatRating(portfolio.rating)}</span>
                  <span className="text-slate-500 text-[10px]">({portfolio.ratingCount} reviews)</span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 group-hover:text-black transition-colors">
                {portfolio.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                {portfolio.tagline}
              </p>
            </div>

            {/* Rubric mini summary */}
            {portfolio.ratingBreakdown && (
              <div className="grid grid-cols-4 gap-2 py-2.5 border-y border-slate-100 text-center font-mono text-xs">
                <div>
                  <div className="text-[10px] text-slate-500">Code</div>
                  <div className="font-bold text-slate-900">{portfolio.ratingBreakdown.codeQuality.toFixed(1)}★</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Perf</div>
                  <div className="font-bold text-emerald-700">{portfolio.ratingBreakdown.performance.toFixed(1)}★</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">UX</div>
                  <div className="font-bold text-amber-700">{portfolio.ratingBreakdown.design.toFixed(1)}★</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Docs</div>
                  <div className="font-bold text-indigo-700">{portfolio.ratingBreakdown.documentation.toFixed(1)}★</div>
                </div>
              </div>
            )}

            {/* Tech stack & Action */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-wrap gap-1.5">
                {portfolio.techStack.slice(0, 4).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-md bg-slate-50 text-[11px] font-mono text-slate-700 border border-slate-200">
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div onClick={(e) => e.stopPropagation()} className="relative inline-flex items-center">
                  <EmojiReaction
                    size="sm"
                    asChild
                    onReact={handleReact}
                  >
                    <button
                      type="button"
                      onClick={handleLike}
                      className={cn(
                        "flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer font-mono",
                        isLiked
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                      )}
                      aria-label="React or like portfolio"
                    >
                      <Heart className={cn("w-3 h-3", isLiked && "fill-rose-400 text-rose-400")} />
                      <span className="tabular-nums">{likesCount}</span>
                    </button>
                  </EmojiReaction>
                </div>

                <span className="p-1.5 rounded-md bg-slate-900 text-white font-medium hover:bg-black transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

          </div>
        </div>
      </article>
    );
  }

  // 3. STANDARD GRID CARD (Normal, Clean Container - 12px max radius, no floating glass, no hover transform)
  return (
    <article
      onClick={() => onSelect(portfolio)}
      className="group relative flex flex-col rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer overflow-hidden"
    >
      {/* Card Header Media */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 border-b border-slate-200">
        <img
          src={portfolio.thumbnail}
          alt={portfolio.title}
          className="w-full h-full object-cover transition-opacity group-hover:opacity-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
          <span className={cn("text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200", getCategoryColor(portfolio.category))}>
            {portfolio.category}
          </span>
          {portfolio.showcaseType === "daily" && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              <Flame className="w-3 h-3 text-amber-500" /> Daily
            </span>
          )}
          {portfolio.showcaseType === "weekly" && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              <Award className="w-3 h-3 text-amber-600" /> Weekly
            </span>
          )}
        </div>

        {/* Author Badge */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-900">
          <img
            src={portfolio.author.avatar}
            alt={portfolio.author.name}
            className="w-3.5 h-3.5 rounded object-cover"
          />
          <span className="text-[11px] font-medium text-slate-900 truncate max-w-[110px]">
            {portfolio.author.name}
          </span>
          {portfolio.author.isVerified && (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
          )}
        </div>

        {/* Inspect icon */}
        <div className="absolute bottom-2.5 right-2.5 p-1 rounded-md bg-white border border-slate-200 text-slate-700 group-hover:text-slate-900 transition-colors">
          <ArrowUpRight className="w-3 h-3" />
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-4">
        <div className="mb-2">
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-black transition-colors line-clamp-1">
            {portfolio.title}
          </h3>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
            {portfolio.tagline}
          </p>
        </div>

        {/* Tech Stack Chips */}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-2.5">
          {portfolio.techStack.slice(0, 3).map((tech) => (
            <span
              key={tech}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200 hover:text-slate-900 transition-colors"
            >
              {tech}
            </span>
          ))}
          {portfolio.techStack.length > 3 && (
            <span className="text-[10px] font-mono text-slate-400 px-1">
              +{portfolio.techStack.length - 3}
            </span>
          )}
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
          {/* Rating Badge */}
          <div className="flex items-center gap-1 text-xs font-mono text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span className="font-semibold tabular-nums">{formatRating(portfolio.rating)}</span>
            <span className="text-slate-400 text-[10px] tabular-nums">({portfolio.ratingCount})</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Likes / Reactions */}
            <div onClick={(e) => e.stopPropagation()} className="relative inline-flex items-center">
              <EmojiReaction
                size="sm"
                asChild
                onReact={handleReact}
              >
                <button
                  type="button"
                  onClick={handleLike}
                  className={cn(
                    "flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border transition-colors cursor-pointer font-mono",
                    isLiked
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                  )}
                  aria-label="React or like portfolio"
                >
                  <Heart className={cn("w-3 h-3", isLiked && "fill-rose-400 text-rose-400")} />
                  <span className="text-[11px] tabular-nums">{formatNumber(likesCount)}</span>
                </button>
              </EmojiReaction>
            </div>

            {/* Comments */}
            <div className="flex items-center gap-1 text-xs text-slate-600 font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
              <MessageSquare className="w-3 h-3 text-slate-400" />
              <span className="text-[11px] tabular-nums">{portfolio.commentsCount}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
