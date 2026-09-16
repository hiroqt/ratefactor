"use client";

import React from "react";
import Link from "next/link";
import { FolderSearch, RotateCcw, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface FilterBadgeItem {
  label: string;
  onRemove?: () => void;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
  };
  secondaryAction?: React.ReactNode;
  filterBadges?: FilterBadgeItem[];
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  filterBadges,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        "relative flex flex-col items-center justify-center p-8 sm:p-14 text-center rounded-3xl border border-slate-200/90 dark:border-white/10 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/30 dark:from-white/[0.04] dark:via-[#121215]/80 dark:to-transparent shadow-xs overflow-hidden",
        className
      )}
    >
      {/* Specular Edge Line */}
      <div className="absolute top-0 inset-x-12 sm:inset-x-24 h-[1px] bg-gradient-to-r from-transparent via-slate-300/80 dark:via-white/20 to-transparent pointer-events-none" />

      {/* Subtle Radial Atmosphere (Replaces harsh grey slab with refined luminosity) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-44 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Icon Squircle Badge */}
      <div className="relative mb-4 group">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-white/15 shadow-sm shadow-slate-200/60 dark:shadow-black/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:scale-105">
          {icon || <FolderSearch className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />}
        </div>
      </div>

      {/* Active Filter Badges (if any) */}
      {filterBadges && filterBadges.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3.5 max-w-md">
          {filterBadges.map((badge, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700"
            >
              <span>{badge.label}</span>
              {badge.onRemove && (
                <button
                  type="button"
                  onClick={badge.onRemove}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  title="Remove filter"
                  aria-label={`Remove filter ${badge.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2 max-w-lg">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-md mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {/* Action Buttons */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2.5 flex-wrap justify-center relative z-10">
          {action &&
            (action.href ? (
              <Link
                href={action.href}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-xs hover:shadow-emerald-500/20 active:translate-y-0.5 transition-all cursor-pointer"
              >
                {action.icon || <RotateCcw className="w-3.5 h-3.5" />}
                <span>{action.label}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-xs hover:shadow-emerald-500/20 active:translate-y-0.5 transition-all cursor-pointer"
              >
                {action.icon || <RotateCcw className="w-3.5 h-3.5" />}
                <span>{action.label}</span>
              </button>
            ))}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
