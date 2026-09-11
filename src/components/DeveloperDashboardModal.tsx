"use client";

import React from "react";
import { 
  X, 
  Terminal, 
  Star, 
  Heart, 
  MessageSquare, 
  Award, 
  Flame, 
  ExternalLink, 
  Trash2, 
  BarChart3, 
  Activity, 
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
  Zap
} from "lucide-react";
import { Portfolio } from "@/types/portfolio";
import { cn, formatNumber } from "@/lib/utils";

interface DeveloperDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  myPortfolios: Portfolio[];
  onSelectPortfolio: (p: Portfolio) => void;
  onDeletePortfolio: (id: string) => void;
  onOpenSubmitModal: () => void;
}

export function DeveloperDashboardModal({
  isOpen,
  onClose,
  myPortfolios,
  onSelectPortfolio,
  onDeletePortfolio,
  onOpenSubmitModal,
}: DeveloperDashboardModalProps) {
  if (!isOpen) return null;

  const totalLikes = myPortfolios.reduce((acc, p) => acc + p.likesCount, 0);
  const totalComments = myPortfolios.reduce((acc, p) => acc + p.commentsCount, 0);
  const avgRating =
    myPortfolios.length > 0
      ? myPortfolios.reduce((acc, p) => acc + p.rating, 0) / myPortfolios.length
      : 0;
  const showcaseCount = myPortfolios.filter((p) => p.isShowcase).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-10 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-brand-500/40">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"
                alt="Arnel Rivera"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-foreground text-sm">
                  Arnel Rivera
                </h3>
                <span className="text-[11px] font-mono text-muted">@arneldev</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
              </div>
              <p className="text-[11px] text-muted">
                Developer Dashboard & Portfolio Performance Feed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-surface-raised border border-border">
              <div className="text-xs text-muted font-mono flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-brand-400" /> Submissions
              </div>
              <div className="text-2xl font-mono font-bold text-foreground mt-1 tabular-nums">
                {myPortfolios.length}
              </div>
              <div className="text-[10px] text-muted mt-1">Indexed in discovery</div>
            </div>

            <div className="p-4 rounded-lg bg-surface-raised border border-border">
              <div className="text-xs text-muted font-mono flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-brand-400 fill-brand-400" /> Avg Peer Rating
              </div>
              <div className="text-2xl font-mono font-bold text-brand-400 mt-1 tabular-nums">
                {avgRating.toFixed(2)}★
              </div>
              <div className="text-[10px] text-muted mt-1">Weighted Bayesian score</div>
            </div>

            <div className="p-4 rounded-lg bg-surface-raised border border-border">
              <div className="text-xs text-muted font-mono flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-accent-rose fill-accent-rose" /> Total Likes
              </div>
              <div className="text-2xl font-mono font-bold text-foreground mt-1 tabular-nums">
                {formatNumber(totalLikes)}
              </div>
              <div className="text-[10px] text-muted mt-1">Peer appreciation</div>
            </div>

            <div className="p-4 rounded-lg bg-surface-raised border border-border">
              <div className="text-xs text-muted font-mono flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-300" /> Showcases Won
              </div>
              <div className="text-2xl font-mono font-bold text-amber-300 mt-1 tabular-nums">
                {showcaseCount}
              </div>
              <div className="text-[10px] text-muted mt-1">Daily / Weekly spotlight</div>
            </div>
          </div>

          {/* Submissions Management Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Terminal className="w-4 h-4 text-brand-400" />
                My Portfolio Submissions ({myPortfolios.length})
              </h4>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubmitModal();
                }}
                className="text-xs font-medium text-brand-400 hover:text-brand-300 hover:underline"
              >
                + Submit Another Project
              </button>
            </div>

            {myPortfolios.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-lg">
                <p className="text-xs text-muted">You haven&apos;t submitted any portfolios yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSubmitModal();
                  }}
                  className="mt-3 px-3 py-1.5 rounded-md bg-brand-500 text-background text-xs font-medium"
                >
                  Submit First Portfolio
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myPortfolios.map((portfolio) => (
                  <div
                    key={portfolio.id}
                    className="p-4 rounded-lg bg-surface-raised border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={portfolio.thumbnail}
                        alt={portfolio.title}
                        className="w-16 h-12 rounded object-cover border border-border flex-shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-semibold text-foreground">
                            {portfolio.title}
                          </h5>
                          {portfolio.isShowcase && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/30 flex items-center gap-1">
                              <Flame className="w-3 h-3" /> Showcase
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted truncate max-w-md mt-0.5">
                          {portfolio.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-brand-400 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-brand-400" />
                          {portfolio.rating.toFixed(2)}
                        </span>
                        <span className="text-muted flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {portfolio.likesCount}
                        </span>
                        <span className="text-muted flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {portfolio.commentsCount}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectPortfolio(portfolio);
                          }}
                          className="px-2.5 py-1 rounded bg-surface hover:bg-surface-overlay text-xs font-medium text-foreground border border-border transition-colors flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3 text-muted" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeletePortfolio(portfolio.id)}
                          className="p-1 rounded text-muted hover:text-accent-rose transition-colors"
                          title="Delete submission"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Architectural Health / Scoring breakdown */}
          <div className="p-4 rounded-lg bg-surface-raised border border-border space-y-3">
            <h4 className="text-xs font-mono uppercase text-muted tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-accent-emerald" />
              Community Signal Quality & Showcase Weighting Factors
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded bg-surface border border-border/60">
                <div className="text-muted text-[11px]">Compaction & Architecture</div>
                <div className="font-mono text-base font-bold text-foreground mt-1">4.9 / 5.0</div>
                <div className="text-[10px] text-accent-emerald mt-0.5">Top 2% across platform</div>
              </div>
              <div className="p-2.5 rounded bg-surface border border-border/60">
                <div className="text-muted text-[11px]">Benchmark Reproducibility</div>
                <div className="font-mono text-base font-bold text-foreground mt-1">100%</div>
                <div className="text-[10px] text-accent-emerald mt-0.5">CI Criterion verified</div>
              </div>
              <div className="p-2.5 rounded bg-surface border border-border/60">
                <div className="text-muted text-[11px]">Daily Showcase Weight</div>
                <div className="font-mono text-base font-bold text-brand-400 mt-1">0.94 / 1.0</div>
                <div className="text-[10px] text-brand-400 mt-0.5">High eligibility rank</div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/80 bg-surface-raised flex items-center justify-between text-xs text-muted">
          <span className="font-mono text-[11px]">
            RateFactor Developer Core • Supabase Auth GitHub Session
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-surface border border-border text-foreground hover:bg-surface-overlay transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
