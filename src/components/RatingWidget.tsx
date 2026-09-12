"use client";

import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { RatingBreakdown } from "@/types/portfolio";

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

  const activeRating = hoverRating !== null ? hoverRating : (selectedRating || currentRating);

  const handleSelect = (score: number) => {
    if (!interactive) return;
    setSelectedRating(score);
    if (onRate) onRate(score);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = activeRating >= star;
            const isPartiallyFilled = activeRating >= star - 0.5 && activeRating < star;

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

        <span className="font-mono text-xs font-semibold text-amber-800 tabular-nums">
          {currentRating.toFixed(2)}
        </span>

        <span className="text-xs text-slate-500 tabular-nums">
          ({ratingCount} {ratingCount === 1 ? "review" : "reviews"})
        </span>

        {selectedRating && (
          <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            You rated {selectedRating}★
          </span>
        )}
      </div>

      {breakdown && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
          <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-600 text-[11px]">Code Architecture</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums text-xs">
              {breakdown.codeQuality.toFixed(1)}★
            </span>
          </div>
          <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-600 text-[11px]">Performance</span>
            <span className="font-mono font-bold text-emerald-700 tabular-nums text-xs">
              {breakdown.performance.toFixed(1)}★
            </span>
          </div>
          <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-600 text-[11px]">Visual Craft / UX</span>
            <span className="font-mono font-bold text-amber-700 tabular-nums text-xs">
              {breakdown.design.toFixed(1)}★
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
