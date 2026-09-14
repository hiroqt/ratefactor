"use client";

import React, { useState, useEffect } from "react";
import { Star, Layers, Cpu, Zap, BookOpen } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { RatingBreakdown } from "@/types/portfolio";

export function calculateMeterFillPercent(score: number): number {
  return Math.round(Math.min(100, Math.max(0, (score / 5.0) * 100)));
}

interface RatingWidgetProps {
  currentRating: number;
  ratingCount: number;
  breakdown?: RatingBreakdown;
  userRating?: number;
  onRate?: (score: number) => void;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
}

export function RatingWidget({
  currentRating,
  ratingCount,
  breakdown,
  userRating,
  onRate,
  interactive = true,
  size = "md",
}: RatingWidgetProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(
    userRating || null
  );

  useEffect(() => {
    setSelectedRating(userRating || null);
  }, [userRating]);

  const starSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const isUnrated = ratingCount === 0;
  const activeRating = hoverRating !== null ? hoverRating : (selectedRating || currentRating);

  const handleSelect = (score: number) => {
    if (!interactive) return;
    setSelectedRating(score);
    if (onRate) onRate(score);
  };

  const dimensions = breakdown
    ? [
        {
          key: "design" as const,
          label: "Design & UI/UX",
          score: breakdown.design,
          icon: Layers,
          textColor: "text-amber-800",
          barColor: "bg-amber-500",
        },
        {
          key: "codeQuality" as const,
          label: "Code Quality & Architecture",
          score: breakdown.codeQuality,
          icon: Cpu,
          textColor: "text-indigo-800",
          barColor: "bg-indigo-500",
        },
        {
          key: "performance" as const,
          label: "Performance & Responsiveness",
          score: breakdown.performance,
          icon: Zap,
          textColor: "text-emerald-800",
          barColor: "bg-emerald-500",
        },
        {
          key: "documentation" as const,
          label: "Documentation & Completeness",
          score: breakdown.documentation,
          icon: BookOpen,
          textColor: "text-sky-800",
          barColor: "bg-sky-500",
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = !isUnrated && activeRating >= star;
            const isPartiallyFilled = !isUnrated && activeRating >= star - 0.5 && activeRating < star;

            return (
              <button
                key={star}
                type="button"
                disabled={!interactive}
                onClick={() => handleSelect(star)}
                onMouseEnter={() => interactive && setHoverRating(star)}
                onMouseLeave={() => interactive && setHoverRating(null)}
                className={cn(
                  "p-0.5 rounded transition-transform focus:outline-none",
                  interactive && "hover:scale-110 cursor-pointer text-slate-300 hover:text-amber-500"
                )}
                aria-label={`Rate ${star} out of 5 stars`}
              >
                <Star
                  className={cn(
                    starSizes[size],
                    "transition-colors",
                    isFilled
                      ? "fill-amber-500 text-amber-500"
                      : isPartiallyFilled
                      ? "fill-amber-300 text-amber-400"
                      : "fill-slate-100 text-slate-300"
                  )}
                />
              </button>
            );
          })}
        </div>

        {isUnrated ? (
          <span className="text-xs text-slate-500">No ratings yet</span>
        ) : (
          <>
            <span className="font-mono text-xs font-semibold text-amber-800 tabular-nums">
              {currentRating.toFixed(2)}
            </span>

            <span className="text-xs text-slate-500 tabular-nums">
              ({ratingCount} {ratingCount === 1 ? "review" : "reviews"})
            </span>
          </>
        )}

        {selectedRating && (
          <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            You rated {selectedRating}★
          </span>
        )}
      </div>

      {breakdown && !isUnrated && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 text-xs">
          {dimensions.map((dim) => {
            const Icon = dim.icon;
            const fillPercent = calculateMeterFillPercent(dim.score);
            return (
              <div
                key={dim.key}
                className="flex flex-col gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 text-[11px] font-medium flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                    <span>{dim.label}</span>
                  </span>
                  <span className={cn("font-mono font-bold tabular-nums text-xs", dim.textColor)}>
                    {dim.score.toFixed(1)}★
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-300", dim.barColor)}
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
