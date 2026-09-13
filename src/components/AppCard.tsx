"use client";

import React, { useState, useEffect } from "react";
import { 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  ArrowUpRight, 
  ExternalLink
} from "lucide-react";
import { Portfolio } from "@/types/portfolio";
import { cn, formatNumber, formatRating } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { EmojiReaction } from "@/components/ui/emoji-reaction";
import { getEmojiDisplay } from "./PortfolioDetailModal";

export interface AppCardProps {
  portfolio: Portfolio;
  onSelect: (portfolio: Portfolio) => void;
  onLikeToggle?: (id: string, liked: boolean) => void;
  onReact?: (id: string, emojiName: string) => void;
  className?: string;
  index?: number;
}

const FALLBACK_THUMBNAIL = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'><rect width='800' height='450' fill='%23f1f5f9'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='22' fill='%2394a3b8'>Preview Unavailable</text></svg>";
const FALLBACK_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23e2e8f0'/><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32' fill='%2364748b'>DEV</text></svg>";

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

export function AppCard({
  portfolio,
  onSelect,
  onLikeToggle,
  onReact,
  className,
  index = 0,
}: AppCardProps) {
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
    trackEvent("app_card_like", { portfolioId: portfolio.id, liked: nextState });
    if (onLikeToggle) {
      onLikeToggle(portfolio.id, nextState);
    }
  };

  const handleReact = (emojiName: string) => {
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
    trackEvent("app_card_reaction", { portfolioId: portfolio.id, reaction: emojiName });
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
      case "Mobile":
        return "text-blue-800 bg-blue-50 border-blue-200";
      default:
        return "text-slate-700 bg-slate-100 border-slate-200";
    }
  };

  return (
    <article
      onClick={() => onSelect(portfolio)}
      className={cn(
        "group relative flex flex-col rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden text-left h-full",
        className
      )}
    >
      {/* 1. Clean Media Preview without Eyebrows or Host Overlays */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 border-b border-slate-200">
        <img
          src={portfolio.thumbnail}
          alt={portfolio.title}
          loading="lazy"
          decoding="async"
          onError={onImgError}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Inspect Indicator on Hover */}
        <div className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-lg bg-white/95 text-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs pointer-events-none">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>

      {/* 2. Card Content Body */}
      <div className="flex flex-col flex-1 p-3.5">
        {/* Title & Tagline */}
        <div className="mb-2">
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {portfolio.title}
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {portfolio.tagline}
          </p>
        </div>

        {/* Tech Stack Chips (top 2-3) */}
        <div className="flex items-center gap-1 flex-wrap mt-auto pt-2">
          {portfolio.techStack.slice(0, 2).map((tech) => (
            <span
              key={tech}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[100px]"
            >
              {tech}
            </span>
          ))}
          {portfolio.techStack.length > 2 && (
            <span className="text-[9px] font-mono text-slate-400 px-1">
              +{portfolio.techStack.length - 2}
            </span>
          )}
        </div>

        {/* Author Line */}
        <div className="flex items-center gap-1.5 pt-2.5 mt-2 border-t border-slate-100">
          <img
            src={portfolio.author.avatar}
            alt={portfolio.author.name}
            onError={onAvatarError}
            className="w-4 h-4 rounded-full object-cover border border-slate-200 shrink-0"
          />
          <span className="text-[11px] text-slate-700 font-medium truncate flex-1">
            {portfolio.author.name}
          </span>
          {portfolio.author.isVerified && (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          )}
        </div>

        {/* Card Footer: Domain Category Badge, Rating, Reactions, Comments */}
        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
          {/* Domain Category Pill */}
          <span
            className={cn(
              "text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border",
              getCategoryColor(portfolio.category)
            )}
          >
            {portfolio.category}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Rating */}
            <div className="flex items-center gap-0.5 text-[11px] font-mono text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
              <span className="font-bold tabular-nums">{formatRating(portfolio.rating)}</span>
            </div>

            {/* Reactions / Likes */}
            <div onClick={(e) => e.stopPropagation()} className="relative inline-flex items-center">
              <EmojiReaction
                size="sm"
                align="right"
                asChild
                onReact={handleReact}
              >
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer font-mono",
                    isLiked
                      ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                  aria-label="React to portfolio"
                >
                  <span className="text-xs">{getEmojiDisplay(portfolio.userReaction || "star-struck")}</span>
                  {likesCount > 0 && <span className="tabular-nums font-semibold">{likesCount}</span>}
                </button>
              </EmojiReaction>
            </div>

            {/* Comments Count */}
            <div className="flex items-center gap-0.5 text-[11px] text-slate-500 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
              <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="tabular-nums">{portfolio.commentsCount}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
