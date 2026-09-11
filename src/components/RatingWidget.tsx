"useclient";

import React, { useState } from "react";
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
                  interactive && "hover:scale-110 cursor-pointer text-muted-dark hover:text-brand-400"
                )}
                aria-label={`Rate ${star} out of 5 stars`}
              >
                <Star
                  className={cn(
                    starSizes[size],
                    "transition-colors",
                    isFilled
                      ? "fill-brand-500 text-brand-500"
                      : isPartiallyFilled
                      ? "fill-brand-400/50 text-brand-400"
                      : "fill-surface-raised text-muted-dark"
                  )}
                />
              </button>
            );
          })}
        </div>

        <span className="font-mono text-xs font-semibold text-brand-400 tabular-nums">
          {currentRating.toFixed(2)}
        </span>

        <span className="text-xs text-muted tabular-nums">
          ({ratingCount} {ratingCount === 1 ? "review" : "reviews"})
        </span>

        {selectedRating && (
          <span className="text-[11px] font-mono text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-1.5 py-0.5 rounded">
            You rated {selectedRating}★
          </span>
        )}
      </div>

      {breakdown && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted">Code Quality</span>
            <span className="font-mono font-medium text-foreground tabular-nums">
              {breakdown.codeQuality.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Architecture</span>
            <span className="font-mono font-medium text-foreground tabular-nums">
              {breakdown.performance.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Visual UX</span>
            <span className="font-mono font-medium text-foreground tabular-nums">
              {breakdown.design.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Documentation</span>
            <span className="font-mono font-medium text-foreground tabular-nums">
              {breakdown.documentation.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
