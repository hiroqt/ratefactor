"use client";

import React from "react";
import { 
  Flame, 
  ArrowRight, 
  Terminal, 
  CheckCircle2, 
  ShieldCheck, 
  Star, 
  Sparkles,
  GitBranch,
  Cpu,
  Zap
} from "lucide-react";
import { Portfolio } from "@/types/portfolio";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  showcasePortfolio: Portfolio;
  onInspectShowcase: (p: Portfolio) => void;
  onSubmitClick: () => void;
  onExploreClick: () => void;
}

export function HeroSection({
  showcasePortfolio,
  onInspectShowcase,
  onSubmitClick,
  onExploreClick,
}: HeroSectionProps) {
  return (
    <section className="relative pt-8 pb-12 border-b border-border/60 bg-gradient-to-b from-surface/40 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Asymmetric 2-Column Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column (7 cols): Editorial Typography & Telemetry */}
          <div className="lg:col-span-7 flex flex-col items-start">
            {/* Telemetry pill */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-raised border border-border text-[11px] font-mono text-muted mb-4">
              <span className="w-2 h-2 rounded-full bg-accent-emerald live-beacon" />
              <span className="text-foreground font-medium">DAILY SHOWCASE ALGORITHM ACTIVE</span>
              <span className="text-muted-dark">|</span>
              <span className="text-brand-400">NEXT DROP IN 04:12:30</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
              Developer portfolios rated on{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-brand-400 to-amber-200">
                code, architecture,
              </span>{" "}
              and craft.
            </h1>

            {/* Grounded, authentic description */}
            <p className="mt-4 text-sm sm:text-base text-muted max-w-2xl leading-relaxed">
              Ditch superficial Dribbble mockups. RateFactor is a peer-critique platform where engineers 
              evaluate projects on real architectural depth, memory safety, test coverage, and raw performance benchmarks.
            </p>

            {/* Action CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExploreClick}
                className="px-4 py-2.5 rounded-md bg-brand-500 hover:bg-brand-400 text-background font-medium text-xs shadow-sm transition-all hover:shadow-glow flex items-center gap-2"
              >
                <span>Browse Portfolios</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onSubmitClick}
                className="px-4 py-2.5 rounded-md bg-surface-raised hover:bg-surface-overlay text-foreground border border-border hover:border-border-hover font-medium text-xs transition-colors flex items-center gap-2"
              >
                <Terminal className="w-3.5 h-3.5 text-brand-400" />
                <span>Submit Your Work</span>
              </button>
            </div>

            {/* Real metrics bar */}
            <div className="mt-8 pt-6 border-t border-border/50 w-full grid grid-cols-3 sm:grid-cols-4 gap-4 text-left">
              <div>
                <div className="font-mono text-lg font-bold text-foreground tabular-nums">1,248</div>
                <div className="text-[11px] text-muted">Reviewed Projects</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-brand-400 tabular-nums">4.84★</div>
                <div className="text-[11px] text-muted">Benchmark Avg</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-accent-emerald tabular-nums">98.4%</div>
                <div className="text-[11px] text-muted">Signal Quality</div>
              </div>
              <div className="hidden sm:block">
                <div className="font-mono text-lg font-bold text-muted-dark tabular-nums">$0</div>
                <div className="text-[11px] text-muted">Infra Cost MVP</div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Today's Daily Showcase Spotlight Card */}
          <div className="lg:col-span-5 w-full">
            <div className="relative rounded-xl bg-surface border border-border p-5 shadow-elevated hover:border-border-hover transition-all">
              
              {/* Badge header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/30">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-brand-400 font-semibold">
                      Daily Showcase Winner
                    </div>
                    <div className="text-xs text-muted">Curated by weighted engagement & code score</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-mono font-bold text-brand-400 bg-surface-raised px-2 py-0.5 rounded border border-border">
                  <Star className="w-3.5 h-3.5 fill-brand-500 text-brand-500" />
                  {showcasePortfolio.rating.toFixed(2)}
                </div>
              </div>

              {/* Showcase preview media */}
              <div 
                onClick={() => onInspectShowcase(showcasePortfolio)}
                className="group relative mt-3 aspect-[16/9] rounded-lg overflow-hidden border border-border cursor-pointer bg-surface-raised"
              >
                <img
                  src={showcasePortfolio.thumbnail}
                  alt={showcasePortfolio.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-80" />
                
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={showcasePortfolio.author.avatar}
                      alt={showcasePortfolio.author.name}
                      className="w-6 h-6 rounded-full border border-border object-cover"
                    />
                    <div>
                      <div className="text-xs font-medium text-foreground leading-none">{showcasePortfolio.author.name}</div>
                      <div className="text-[10px] font-mono text-muted leading-none mt-1">{showcasePortfolio.author.role}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/30 px-2 py-0.5 rounded">
                    Verified
                  </span>
                </div>
              </div>

              {/* Content description */}
              <div className="mt-3.5">
                <h3 className="text-base font-semibold text-foreground hover:text-brand-400 transition-colors cursor-pointer"
                    onClick={() => onInspectShowcase(showcasePortfolio)}>
                  {showcasePortfolio.title}
                </h3>
                <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">
                  {showcasePortfolio.tagline}
                </p>
              </div>

              {/* Criteria Scorecard Bars */}
              <div className="mt-3.5 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-1.5 rounded bg-surface-raised border border-border/50">
                  <span className="text-muted flex items-center gap-1.5">
                    <Cpu className="w-3 h-3 text-brand-400" /> Code Quality
                  </span>
                  <span className="font-mono font-bold text-foreground">5.0</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-surface-raised border border-border/50">
                  <span className="text-muted flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-accent-emerald" /> Performance
                  </span>
                  <span className="font-mono font-bold text-foreground">5.0</span>
                </div>
              </div>

              {/* Inspect Button */}
              <button
                type="button"
                onClick={() => onInspectShowcase(showcasePortfolio)}
                className="w-full mt-3.5 py-2 rounded-md bg-surface-raised hover:bg-surface-overlay border border-border hover:border-brand-500/50 text-foreground font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Inspect Architecture & Full Review</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
