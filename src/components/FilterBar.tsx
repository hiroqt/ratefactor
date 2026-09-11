"use client";

import React from "react";
import { 
  SlidersHorizontal, 
  LayoutGrid, 
  List, 
  Sparkles, 
  Star, 
  Heart, 
  MessageSquare, 
  Clock, 
  Award,
  Filter
} from "lucide-react";
import { PortfolioCategory, SortOption } from "@/types/portfolio";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  activeCategory: PortfolioCategory;
  onCategoryChange: (cat: PortfolioCategory) => void;
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  selectedTech: string | null;
  onTechSelect: (tech: string | null) => void;
  availableTechs: string[];
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  totalCount: number;
}

const CATEGORIES: PortfolioCategory[] = [
  "All",
  "Systems",
  "Frontend",
  "Fullstack",
  "Design Engineer",
  "AI / ML",
];

export function FilterBar({
  activeCategory,
  onCategoryChange,
  activeSort,
  onSortChange,
  selectedTech,
  onTechSelect,
  availableTechs,
  viewMode,
  onViewModeChange,
  totalCount,
}: FilterBarProps) {
  return (
    <div className="space-y-3 py-4">
      {/* Top Filter Row: Categories + View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                activeCategory === category
                  ? "bg-surface-raised text-foreground border border-border-hover shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface/60"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {/* View Mode Switcher + Count */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs font-mono text-muted tabular-nums">
            Showing <strong className="text-foreground">{totalCount}</strong> portfolios
          </span>

          <div className="flex items-center rounded-md bg-surface-raised p-0.5 border border-border">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "p-1.5 rounded text-xs transition-colors",
                viewMode === "grid"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "p-1.5 rounded text-xs transition-colors",
                viewMode === "list"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
              aria-label="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Second Row: Sorting Options & Tech Stack Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/40">
        
        {/* Sort criteria */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-muted-dark mr-1 flex items-center gap-1 font-mono">
            <Filter className="w-3 h-3" /> Sort:
          </span>

          <button
            type="button"
            onClick={() => onSortChange("highest_rated")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1",
              activeSort === "highest_rated"
                ? "bg-brand-500/10 text-brand-400 border border-brand-500/30 font-medium"
                : "text-muted hover:text-foreground"
            )}
          >
            <Star className="w-3 h-3" />
            Highest Rated
          </button>

          <button
            type="button"
            onClick={() => onSortChange("most_liked")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1",
              activeSort === "most_liked"
                ? "bg-accent-rose/10 text-accent-rose border border-accent-rose/30 font-medium"
                : "text-muted hover:text-foreground"
            )}
          >
            <Heart className="w-3 h-3" />
            Most Liked
          </button>

          <button
            type="button"
            onClick={() => onSortChange("most_discussed")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1",
              activeSort === "most_discussed"
                ? "bg-surface-raised text-foreground border border-border font-medium"
                : "text-muted hover:text-foreground"
            )}
          >
            <MessageSquare className="w-3 h-3" />
            Most Discussed
          </button>

          <button
            type="button"
            onClick={() => onSortChange("latest")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1",
              activeSort === "latest"
                ? "bg-surface-raised text-foreground border border-border font-medium"
                : "text-muted hover:text-foreground"
            )}
          >
            <Clock className="w-3 h-3" />
            Latest
          </button>

          <button
            type="button"
            onClick={() => onSortChange("showcase")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1",
              activeSort === "showcase"
                ? "bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium"
                : "text-muted hover:text-foreground"
            )}
          >
            <Award className="w-3 h-3" />
            Showcases Only
          </button>
        </div>

        {/* Tech Stack Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-mono">
          <span className="text-muted-dark mr-1">Tech:</span>
          {availableTechs.map((tech) => (
            <button
              key={tech}
              type="button"
              onClick={() => onTechSelect(selectedTech === tech ? null : tech)}
              className={cn(
                "px-2 py-0.5 rounded border transition-colors",
                selectedTech === tech
                  ? "bg-brand-500/20 text-brand-300 border-brand-500/50"
                  : "bg-surface-raised border-border/60 text-muted hover:text-foreground"
              )}
            >
              {tech}
            </button>
          ))}
          {selectedTech && (
            <button
              type="button"
              onClick={() => onTechSelect(null)}
              className="text-[10px] text-accent-rose hover:underline ml-1"
            >
              Clear
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
