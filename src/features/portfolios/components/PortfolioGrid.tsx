"use client";

import React from "react";
import { Portfolio } from "@/types/portfolio";
import { PortfolioCard } from "@/components/PortfolioCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { cn } from "@/lib/utils";

export interface PortfolioGridProps {
  portfolios: Portfolio[];
  onSelectPortfolio: (p: Portfolio) => void;
  onLikeToggle?: (portfolioId: string, isLiked: boolean) => void;
  onReact?: (portfolioId: string, emojiName: string) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function PortfolioGrid({
  portfolios,
  onSelectPortfolio,
  onLikeToggle,
  onReact,
  isLoading = false,
  emptyTitle = "No portfolios found",
  emptyDescription = "Try adjusting your search query, filter criteria, or submit the first project!",
  emptyAction,
  className,
}: PortfolioGridProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
          className
        )}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 flex flex-col gap-4"
          >
            <Skeleton className="w-full h-48 rounded-xl" />
            <Skeleton className="w-3/4 h-6 rounded-lg" />
            <Skeleton className="w-full h-4 rounded-lg" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="w-16 h-5 rounded-full" />
              <Skeleton className="w-20 h-5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        className
      )}
    >
      {portfolios.map((portfolio, index) => (
        <PortfolioCard
          key={portfolio.id}
          portfolio={portfolio}
          index={index}
          onSelect={onSelectPortfolio}
          onLikeToggle={onLikeToggle}
          onReact={onReact}
        />
      ))}
    </div>
  );
}
