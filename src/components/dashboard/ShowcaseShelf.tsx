"use client";

import React from "react";
import { 
  Pin, 
  Star, 
  ExternalLink, 
  Github, 
  Heart, 
  MessageSquare, 
  Sparkles, 
  SlidersHorizontal, 
  Plus, 
  Award,
  Layers,
  Flame,
  ArrowUpRight
} from "lucide-react";
import { Portfolio } from "@/types/portfolio";
import { cn, formatNumber, formatRating } from "@/lib/utils";
import { getEmojiDisplay } from "../PortfolioDetailModal";

interface ShowcaseShelfProps {
  myPortfolios: Portfolio[];
  pinnedIds: string[];
  spotlightId?: string;
  onCustomizePins: () => void;
  onSelectPortfolio: (p: Portfolio) => void;
  onOpenSubmitModal: () => void;
}

export function ShowcaseShelf({
  myPortfolios,
  pinnedIds,
  spotlightId,
  onCustomizePins,
  onSelectPortfolio,
  onOpenSubmitModal,
}: ShowcaseShelfProps) {
  // Find pinned portfolios
  const pinnedPortfolios = pinnedIds
    .map((id) => myPortfolios.find((p) => p.id === id))
    .filter(Boolean) as Portfolio[];

  // Pinned showcase portfolios
  const activeShowcases = pinnedPortfolios;

  const spotlightPortfolio =
    (spotlightId && activeShowcases.find((p) => p.id === spotlightId)) ||
    activeShowcases[0] ||
    null;

  const secondaryShowcases = activeShowcases.filter(
    (p) => p.id !== spotlightPortfolio?.id
  );

  return (
    <section className="space-y-4 w-full min-w-0 max-w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-slate-900" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Showcase Shelf (Pinned Architectures)
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
              {activeShowcases.length} / 6 pinned
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Architectures highlighted on your public profile for peers, reviewers, and engineering teams.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onCustomizePins}
            className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Customize Pins</span>
          </button>

          <button
            type="button"
            onClick={onOpenSubmitModal}
            className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span>New Architecture</span>
          </button>
        </div>
      </div>

      {activeShowcases.length === 0 ? (
        /* Empty State */
        <div className="p-8 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <Pin className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No Showcase Portfolios Pinned Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Pin up to 6 of your best architectures to showcase them to visiting developers and recruiters.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={onCustomizePins}
              className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-black transition-colors"
            >
              Select Portfolios to Showcase
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Featured Spotlight Card */}
          {spotlightPortfolio && (
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden group w-full min-w-0">
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row gap-5 justify-between w-full min-w-0">
                <div className="space-y-3 max-w-xl w-full min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1 font-semibold">
                      <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                      Primary Spotlight Showcase
                    </span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
                      {spotlightPortfolio.category}
                    </span>
                    {spotlightPortfolio.isShowcase && (
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                        <Award className="w-2.5 h-2.5" />
                        Platform Awardee
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                      {spotlightPortfolio.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                      {spotlightPortfolio.tagline}
                    </p>
                  </div>

                  {/* Tech stack chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {spotlightPortfolio.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-white/90 border border-white/10"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Rating Breakdown & Stats */}
                  <div className="flex items-center gap-4 pt-2 text-xs font-mono text-slate-300 flex-wrap">
                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                      ★ {formatRating(spotlightPortfolio.rating)}
                      <span className="text-slate-400 font-normal">
                        ({spotlightPortfolio.ratingCount} reviews)
                      </span>
                    </div>
                    {spotlightPortfolio.likesCount > 0 && (
                      <div className="flex items-center gap-1 text-amber-300">
                        <span className="text-sm">{getEmojiDisplay(spotlightPortfolio.userReaction || "star-struck")}</span>
                        <span>{spotlightPortfolio.likesCount}</span>
                      </div>
                    )}
                    {spotlightPortfolio.commentsCount > 0 && (
                      <div className="flex items-center gap-1 text-slate-300">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{spotlightPortfolio.commentsCount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right / Bottom Action Box */}
                <div className="flex flex-col justify-between sm:items-end gap-3 flex-shrink-0">
                  <div className="w-full sm:w-56 aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 shadow-lg relative bg-slate-800">
                    <img
                      src={spotlightPortfolio.thumbnail}
                      alt={spotlightPortfolio.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {spotlightPortfolio.portfolioUrl && (
                      <a
                        href={spotlightPortfolio.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <span>Live Demo</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {spotlightPortfolio.githubUrl && (
                      <a
                        href={spotlightPortfolio.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
                        title="GitHub Repo"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectPortfolio(spotlightPortfolio)}
                      className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors border border-white/10"
                    >
                      Inspect Deeply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Pinned Portfolios Grid (GitHub Style Pinned Repositories) */}
          {secondaryShowcases.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full min-w-0">
              {secondaryShowcases.map((portfolio, idx) => (
                <div
                  key={portfolio.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group min-w-0 w-full overflow-hidden"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Pin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <h5 className="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-emerald-700 transition-colors">
                          {portfolio.title}
                        </h5>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
                        {portfolio.category}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {portfolio.tagline}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {portfolio.techStack.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-50 text-slate-600 border border-slate-200"
                        >
                          {tech}
                        </span>
                      ))}
                      {portfolio.techStack.length > 4 && (
                        <span className="text-[10px] font-mono text-slate-400">
                          +{portfolio.techStack.length - 4}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
                      <span className="text-amber-800 font-semibold">
                        ★ {formatRating(portfolio.rating)}
                      </span>
                      {portfolio.likesCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="text-xs">{getEmojiDisplay(portfolio.userReaction || "star-struck")}</span>
                          <span>{portfolio.likesCount}</span>
                        </span>
                      )}
                      {portfolio.commentsCount > 0 && <span>{portfolio.commentsCount} 💬</span>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {portfolio.portfolioUrl && (
                        <a
                          href={portfolio.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Live Demo"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectPortfolio(portfolio)}
                        className="px-2.5 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
