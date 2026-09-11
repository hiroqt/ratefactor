"use client";

import React, { useState } from "react";
import Image from "next/image";
import { 
  Heart, 
  MessageSquare, 
  Star, 
  ExternalLink, 
  Github, 
  Award, 
  Sparkles,
  Flame,
  CheckCircle2
} from "lucide-react";
import { Portfolio } from "@/types/portfolio";
import { cn, formatNumber } from "@/lib/utils";

interface PortfolioCardProps {
  portfolio: Portfolio;
  onSelect: (portfolio: Portfolio) => void;
  onLikeToggle?: (id: string, liked: boolean) => void;
  viewMode?: "grid" | "list";
}

export function PortfolioCard({
  portfolio,
  onSelect,
  onLikeToggle,
  viewMode = "grid",
}: PortfolioCardProps) {
  const [isLiked, setIsLiked] = useState<boolean>(portfolio.isLiked || false);
  const [likesCount, setLikesCount] = useState<number>(portfolio.likesCount);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isLiked;
    setIsLiked(nextState);
    const nextCount = nextState ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLikesCount(nextCount);
    if (onLikeToggle) {
      onLikeToggle(portfolio.id, nextState);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Systems":
        return "text-orange-400 bg-orange-950/30 border-orange-800/40";
      case "Design Engineer":
        return "text-pink-400 bg-pink-950/30 border-pink-800/40";
      case "Frontend":
        return "text-cyan-400 bg-cyan-950/30 border-cyan-800/40";
      case "Fullstack":
        return "text-emerald-400 bg-emerald-950/30 border-emerald-800/40";
      case "AI / ML":
        return "text-purple-400 bg-purple-950/30 border-purple-800/40";
      default:
        return "text-gray-400 bg-gray-900 border-gray-800";
    }
  };

  if (viewMode === "list") {
    return (
      <article
        onClick={() => onSelect(portfolio)}
        className="group relative flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-surface border border-border hover:border-border-hover transition-all cursor-pointer gap-4"
      >
        <div className="flex items-start gap-4 flex-1">
          <div className="relative w-20 h-16 rounded overflow-hidden flex-shrink-0 bg-surface-raised border border-border">
            <img
              src={portfolio.thumbnail}
              alt={portfolio.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border", getCategoryColor(portfolio.category))}>
                {portfolio.category}
              </span>
              {portfolio.showcaseType === "daily" && (
                <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-brand-400 bg-brand-500/10 border border-brand-500/30 px-2 py-0.5 rounded">
                  <Flame className="w-3 h-3 text-brand-400" /> Daily Showcase
                </span>
              )}
              {portfolio.showcaseType === "weekly" && (
                <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                  <Award className="w-3 h-3 text-amber-300" /> Weekly Champion
                </span>
              )}
            </div>

            <h3 className="font-semibold text-foreground text-base group-hover:text-brand-400 transition-colors truncate">
              {portfolio.title}
            </h3>
            <p className="text-xs text-muted truncate max-w-xl">
              {portfolio.tagline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end md:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            {portfolio.techStack.slice(0, 3).map((tech) => (
              <span key={tech} className="px-2 py-0.5 rounded bg-surface-raised text-muted text-[11px] border border-border/50">
                {tech}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-mono text-brand-400 bg-surface-raised px-2 py-1 rounded border border-border">
              <Star className="w-3.5 h-3.5 fill-brand-500 text-brand-500" />
              <span className="font-semibold tabular-nums">{portfolio.rating.toFixed(2)}</span>
            </div>

            <button
              type="button"
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1 text-xs px-2.5 py-1 rounded border transition-colors",
                isLiked
                  ? "bg-accent-rose/10 border-accent-rose/40 text-accent-rose"
                  : "bg-surface-raised border-border text-muted hover:text-foreground"
              )}
            >
              <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-accent-rose text-accent-rose")} />
              <span className="font-mono tabular-nums">{likesCount}</span>
            </button>

            <div className="flex items-center gap-1 text-xs text-muted font-mono bg-surface-raised px-2 py-1 rounded border border-border">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="tabular-nums">{portfolio.commentsCount}</span>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={() => onSelect(portfolio)}
      className="group relative flex flex-col rounded-lg bg-surface border border-border hover:border-border-hover transition-all duration-200 cursor-pointer overflow-hidden shadow-subtle-card hover:shadow-elevated"
    >
      {/* Card Header Media */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-raised border-b border-border">
        <img
          src={portfolio.thumbnail}
          alt={portfolio.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
        />

        {/* Top Floating Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          <span className={cn("text-[11px] font-mono font-medium px-2.5 py-0.5 rounded backdrop-blur-md border", getCategoryColor(portfolio.category))}>
            {portfolio.category}
          </span>
          {portfolio.showcaseType === "daily" && (
            <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-brand-300 bg-background/90 border border-brand-500/40 px-2.5 py-0.5 rounded shadow-sm">
              <Flame className="w-3 h-3 text-brand-400" /> Daily Showcase
            </span>
          )}
          {portfolio.showcaseType === "weekly" && (
            <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-amber-200 bg-background/90 border border-amber-500/40 px-2.5 py-0.5 rounded shadow-sm">
              <Award className="w-3 h-3 text-amber-300" /> Weekly Pick
            </span>
          )}
        </div>

        {/* Floating Author Pill */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-2 bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-border/70">
          <img
            src={portfolio.author.avatar}
            alt={portfolio.author.name}
            className="w-4 h-4 rounded-full object-cover ring-1 ring-border"
          />
          <span className="text-[11px] font-medium text-foreground truncate max-w-[120px]">
            {portfolio.author.name}
          </span>
          {portfolio.author.isVerified && (
            <CheckCircle2 className="w-3 h-3 text-accent-emerald flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-4">
        <div className="mb-2">
          <h3 className="text-base font-semibold text-foreground group-hover:text-brand-400 transition-colors line-clamp-1">
            {portfolio.title}
          </h3>
          <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">
            {portfolio.tagline}
          </p>
        </div>

        {/* Tech Stack Chips */}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-3">
          {portfolio.techStack.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised text-muted border border-border/60 hover:text-foreground transition-colors"
            >
              {tech}
            </span>
          ))}
          {portfolio.techStack.length > 4 && (
            <span className="text-[10px] font-mono text-muted-dark px-1">
              +{portfolio.techStack.length - 4}
            </span>
          )}
        </div>

        {/* Card Footer Bar */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60">
          {/* Rating Pill */}
          <div className="flex items-center gap-1 text-xs font-mono text-brand-400 bg-surface-raised px-2 py-1 rounded border border-border">
            <Star className="w-3.5 h-3.5 fill-brand-500 text-brand-500" />
            <span className="font-semibold tabular-nums">{portfolio.rating.toFixed(2)}</span>
            <span className="text-muted-dark text-[11px] tabular-nums">({portfolio.ratingCount})</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Likes Button */}
            <button
              type="button"
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors",
                isLiked
                  ? "bg-accent-rose/10 border-accent-rose/40 text-accent-rose"
                  : "bg-surface-raised border-border text-muted hover:text-foreground"
              )}
              aria-label="Like portfolio"
            >
              <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-accent-rose text-accent-rose")} />
              <span className="font-mono text-[11px] tabular-nums">{formatNumber(likesCount)}</span>
            </button>

            {/* Comments Counter */}
            <div className="flex items-center gap-1 text-xs text-muted font-mono bg-surface-raised px-2 py-1 rounded border border-border">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[11px] tabular-nums">{portfolio.commentsCount}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
