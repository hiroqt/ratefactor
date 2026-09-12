"use client";

import React from "react";
import { 
  LayoutGrid, 
  List, 
  Star, 
  Heart, 
  MessageSquare, 
  Clock, 
  Award,
  Filter,
  Columns
} from "lucide-react";
import { PortfolioCategory, SortOption } from "@/types/portfolio";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";

interface FilterBarProps {
  activeCategory: PortfolioCategory;
  onCategoryChange: (cat: PortfolioCategory) => void;
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  selectedTech: string | null;
  onTechSelect: (tech: string | null) => void;
  availableTechs: string[];
  viewMode: "grid" | "list" | "mosaic";
  onViewModeChange: (mode: "grid" | "list" | "mosaic") => void;
  totalCount: number;
}

const CATEGORIES: PortfolioCategory[] = [
  "All",
  "Developer",
  "Arts",
  "Client",
  "Systems",
  "Frontend",
  "Fullstack",
  "Design Engineer",
  "Mobile",
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
    <div className="space-y-4 py-4 select-none">
      {/* Top Filter Row: Category Tabs + View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Category Tabs: clean Linear/GitHub segmented control (no sliding bouncy pills, no rounded-2xl) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none p-1 rounded-lg bg-slate-100 border border-slate-200">
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryChange(category)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                  isActive
                    ? "bg-white text-slate-900 font-semibold border border-slate-200 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* View Switcher + Total Counter */}
        <div className="flex items-center gap-3 self-end lg:self-auto">
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            Showing <strong className="text-slate-900 font-semibold inline-flex items-center"><AnimatedCounter value={totalCount} duration={0.8} /></strong> architectures
          </span>

          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => onViewModeChange("mosaic")}
              className={cn(
                "p-1.5 px-2 rounded-md text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer",
                viewMode === "mosaic"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
              title="Editorial Mosaic layout"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Mosaic</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "p-1.5 px-2 rounded-md text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer",
                viewMode === "list"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
              title="Streamlined List layout"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">List</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "p-1.5 px-2 rounded-md text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer",
                viewMode === "grid"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              )}
              title="Compact Grid layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Second Row: Sorting Criteria & Tech Stack Chips */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2.5 border-t border-slate-200">
        
        {/* Sort Options with Normal Clean Buttons (no rounded-full pills, no random colors) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1 font-mono">
            <Filter className="w-3 h-3 text-slate-500" /> Sort:
          </span>

          <button
            type="button"
            onClick={() => onSortChange("highest_rated")}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer border",
              activeSort === "highest_rated"
                ? "bg-slate-900 text-white border-slate-900 font-medium shadow-xs"
                : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Star className={cn("w-3 h-3", activeSort === "highest_rated" ? "fill-amber-400 text-amber-400" : "text-amber-500")} />
            Highest Rated
          </button>

          <button
            type="button"
            onClick={() => onSortChange("most_liked")}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer border",
              activeSort === "most_liked"
                ? "bg-slate-900 text-white border-slate-900 font-medium shadow-xs"
                : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Heart className={cn("w-3 h-3", activeSort === "most_liked" ? "fill-rose-400 text-rose-400" : "text-rose-500")} />
            Most Liked
          </button>

          <button
            type="button"
            onClick={() => onSortChange("most_discussed")}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer border",
              activeSort === "most_discussed"
                ? "bg-slate-900 text-white border-slate-900 font-medium shadow-xs"
                : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <MessageSquare className="w-3 h-3 text-slate-400" />
            Discussions
          </button>

          <button
            type="button"
            onClick={() => onSortChange("latest")}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer border",
              activeSort === "latest"
                ? "bg-slate-900 text-white border-slate-900 font-medium shadow-xs"
                : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Clock className="w-3 h-3 text-slate-400" />
            Latest
          </button>

          <button
            type="button"
            onClick={() => onSortChange("showcase")}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer border",
              activeSort === "showcase"
                ? "bg-slate-900 text-white border-slate-900 font-medium shadow-xs"
                : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Award className="w-3 h-3 text-slate-400" />
            Showcases
          </button>
        </div>

        {/* Tech Stack Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono scrollbar-none">
          <span className="text-slate-400 mr-1">Tech:</span>
          {availableTechs.map((tech) => (
            <button
              key={tech}
              type="button"
              onClick={() => onTechSelect(selectedTech === tech ? null : tech)}
              className={cn(
                "px-2 py-0.5 rounded-md border transition-colors cursor-pointer",
                selectedTech === tech
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {tech}
            </button>
          ))}
          {selectedTech && (
            <button
              type="button"
              onClick={() => onTechSelect(null)}
              className="text-[10px] text-slate-500 hover:text-slate-900 hover:underline ml-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
