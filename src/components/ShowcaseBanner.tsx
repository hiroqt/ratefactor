"use client";

import React from "react";
import { Award, Flame, Star, ArrowUpRight, Github, Sparkles, CheckCircle2 } from "lucide-react";
import { Portfolio } from "@/types/portfolio";
import { cn } from "@/lib/utils";

interface ShowcaseBannerProps {
  dailyShowcase: Portfolio;
  weeklyShowcase: Portfolio;
  onSelectPortfolio: (p: Portfolio) => void;
}

export function ShowcaseBanner({
  dailyShowcase,
  weeklyShowcase,
  onSelectPortfolio,
}: ShowcaseBannerProps) {
  return (
    <section className="py-8 bg-surface-raised/40 border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
          <div>
            <div className="flex items-center gap-2 text-brand-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <Award className="w-4 h-4" />
              Featured Showcases
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Algorithmic Hall of Fame
            </h2>
          </div>
          <p className="text-xs text-muted max-w-md">
            Selected by our automated weighted algorithm balancing peer scores, community engagement, and code architecture depth.
          </p>
        </div>

        {/* 2 Showcases Grid (Daily vs Weekly) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Daily Showcase */}
          <div 
            onClick={() => onSelectPortfolio(dailyShowcase)}
            className="group relative rounded-xl bg-surface border border-border hover:border-brand-500/50 p-5 transition-all cursor-pointer shadow-subtle-card hover:shadow-elevated flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/30 px-2.5 py-1 rounded-md">
                  <Flame className="w-3.5 h-3.5" />
                  Today&apos;s Daily Showcase
                </span>

                <div className="flex items-center gap-1 text-xs font-mono font-bold text-brand-400 bg-surface-raised px-2 py-0.5 rounded border border-border">
                  <Star className="w-3.5 h-3.5 fill-brand-500 text-brand-500" />
                  {dailyShowcase.rating.toFixed(2)}
                </div>
              </div>

              <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden border border-border mb-3 bg-surface-raised">
                <img
                  src={dailyShowcase.thumbnail}
                  alt={dailyShowcase.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <h3 className="text-lg font-bold text-foreground group-hover:text-brand-400 transition-colors">
                {dailyShowcase.title}
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">
                {dailyShowcase.showcaseReason || dailyShowcase.tagline}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <img
                  src={dailyShowcase.author.avatar}
                  alt={dailyShowcase.author.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="text-muted font-medium">{dailyShowcase.author.name}</span>
              </div>
              <span className="text-brand-400 font-mono text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Inspect Showcase <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Weekly Showcase */}
          <div 
            onClick={() => onSelectPortfolio(weeklyShowcase)}
            className="group relative rounded-xl bg-surface border border-border hover:border-amber-500/50 p-5 transition-all cursor-pointer shadow-subtle-card hover:shadow-elevated flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-md">
                  <Award className="w-3.5 h-3.5" />
                  Weekly Showcase Champion
                </span>

                <div className="flex items-center gap-1 text-xs font-mono font-bold text-brand-400 bg-surface-raised px-2 py-0.5 rounded border border-border">
                  <Star className="w-3.5 h-3.5 fill-brand-500 text-brand-500" />
                  {weeklyShowcase.rating.toFixed(2)}
                </div>
              </div>

              <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden border border-border mb-3 bg-surface-raised">
                <img
                  src={weeklyShowcase.thumbnail}
                  alt={weeklyShowcase.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <h3 className="text-lg font-bold text-foreground group-hover:text-amber-300 transition-colors">
                {weeklyShowcase.title}
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">
                {weeklyShowcase.showcaseReason || weeklyShowcase.tagline}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <img
                  src={weeklyShowcase.author.avatar}
                  alt={weeklyShowcase.author.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="text-muted font-medium">{weeklyShowcase.author.name}</span>
              </div>
              <span className="text-amber-300 font-mono text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Inspect Champion <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
