"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  ExternalLink, 
  Github, 
  Star, 
  Heart, 
  MessageSquare, 
  Send, 
  Trash2, 
  Flag, 
  Flame, 
  CheckCircle2, 
  Cpu,
  Layers,
  Zap,
  BookOpen,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Portfolio, CommentItem, RatingBreakdown } from "@/types/portfolio";
import { RatingWidget } from "./RatingWidget";
import { cn, formatNumber, timeAgo, formatRating } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface PortfolioDetailModalProps {
  portfolio: Portfolio | null;
  onClose: () => void;
  onLikeToggle: (id: string, liked: boolean) => void;
  onAddComment: (portfolioId: string, content: string) => void;
  onDeleteComment: (portfolioId: string, commentId: string) => void;
  onRatePortfolio: (portfolioId: string, rating: number, breakdown: RatingBreakdown) => void;
}

export function PortfolioDetailModal({
  portfolio,
  onClose,
  onLikeToggle,
  onAddComment,
  onDeleteComment,
  onRatePortfolio,
}: PortfolioDetailModalProps) {
  const [commentText, setCommentText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [reportedComments, setReportedComments] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"overview" | "reviews" | "discussion">("overview");

  const [criteria, setCriteria] = useState<RatingBreakdown>({
    codeQuality: 5,
    performance: 5,
    design: 4.8,
    documentation: 4.9,
  });

  useEffect(() => {
    if (portfolio) {
      setIsLiked(portfolio.isLiked || false);
      setLikesCount(portfolio.likesCount);
      setUserRating(portfolio.userRating || null);
      if (portfolio.userRatingBreakdown) {
        setCriteria(portfolio.userRatingBreakdown);
      } else if (portfolio.ratingBreakdown) {
        setCriteria(portfolio.ratingBreakdown);
      }
      setCommentText("");
      trackEvent("portfolio_view", {
        portfolioId: portfolio.id,
        title: portfolio.title,
        category: portfolio.category,
      });
    }
  }, [portfolio]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!portfolio) return null;

  const handleLike = () => {
    const nextState = !isLiked;
    setIsLiked(nextState);
    const nextCount = nextState ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLikesCount(nextCount);
    onLikeToggle(portfolio.id, nextState);
    trackEvent("portfolio_like", {
      portfolioId: portfolio.id,
      liked: nextState,
    });
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(portfolio.id, commentText.trim());
    trackEvent("portfolio_comment", {
      portfolioId: portfolio.id,
    });
    setCommentText("");
  };

  const handleCriteriaRate = (key: keyof RatingBreakdown, value: number) => {
    const next = { ...criteria, [key]: value };
    setCriteria(next);
    const avg = Number(
      ((next.codeQuality + next.performance + next.design + next.documentation) / 4).toFixed(2)
    );
    setUserRating(avg);
    onRatePortfolio(portfolio.id, avg, next);
    trackEvent("portfolio_rate", {
      portfolioId: portfolio.id,
      rating: avg,
      criterion: key,
    });
  };

  const handleReportComment = (commentId: string) => {
    setReportedComments((prev) => ({ ...prev, [commentId]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-5 overflow-y-auto">
      {/* Frosted Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Editorial Sheet Modal */}
      <motion.div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="portfolio-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10"
      >
        {/* Specular Edge */}
        <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent pointer-events-none" />

        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
              Architecture Analysis
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-medium">
              {portfolio.category}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Top Showcase Spotlight Banner if present */}
          {portfolio.isShowcase && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <strong className="text-amber-900 font-semibold text-sm block">
                  {portfolio.showcaseType === "daily" ? "Daily Showcase Spotlight" : "Weekly Showcase Champion"}
                </strong>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  {portfolio.showcaseReason}
                </p>
              </div>
            </div>
          )}

          {/* Project Title & Author Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h2 id="portfolio-modal-title" className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900">
                {portfolio.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                {portfolio.tagline}
              </p>
            </div>

            {/* Action Links */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              {portfolio.githubUrl && (
                <a
                  href={portfolio.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium border border-slate-200 transition-all cursor-pointer"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                  <ExternalLink className="w-3 h-3 text-muted" />
                </a>
              )}

              {portfolio.portfolioUrl && (
                <a
                  href={portfolio.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-all"
                >
                  <span>Launch Live</span>
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                </a>
              )}
            </div>
          </div>

          {/* Author Card */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <img
                src={portfolio.author.avatar}
                alt={portfolio.author.name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-900">{portfolio.author.name}</span>
                  {portfolio.author.isVerified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span className="text-xs font-mono text-slate-500">@{portfolio.author.username}</span>
                </div>
                <div className="text-xs text-slate-500">{portfolio.author.role}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer",
                  isLiked
                    ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <Heart className={cn("w-4 h-4", isLiked && "fill-rose-500 text-rose-500")} />
                <span className="font-mono tabular-nums">{formatNumber(likesCount)}</span>
              </button>
            </div>
          </div>

          {/* Project Media Preview */}
          <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
            <img
              src={portfolio.thumbnail}
              alt={portfolio.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 overflow-x-auto no-scrollbar scrollbar-none">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0",
                activeTab === "overview"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <span>Overview</span>
              <span className="hidden sm:inline">&nbsp;&amp; Architecture</span>
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                activeTab === "reviews"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Reviews</span>
              <span className="hidden sm:inline">&nbsp;&amp; Rubric</span>
              <span>({portfolio.ratingCount})</span>
            </button>
            <button
              onClick={() => setActiveTab("discussion")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                activeTab === "discussion"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>Discussion ({portfolio.commentsCount})</span>
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-mono uppercase text-slate-500 tracking-wider mb-2">
                  Technical Architecture &amp; Execution
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {portfolio.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase text-slate-500 tracking-wider mb-2">
                  Technologies &amp; Frameworks
                </h4>
                <div className="flex flex-wrap gap-2">
                  {portfolio.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-mono font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Reviews & Multi-Criteria Rubric */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              {/* Aggregate Score Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-amber-800 tabular-nums">
                      {portfolio.rating.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">out of 5.0</div>
                  </div>
                  <div className="border-l border-slate-200 pl-4 space-y-1">
                    <RatingWidget
                      currentRating={portfolio.rating}
                      ratingCount={portfolio.ratingCount}
                      interactive={false}
                    />
                    <div className="text-[11px] text-slate-500">
                      Aggregated across {portfolio.ratingCount} peer critiques
                    </div>
                  </div>
                </div>

                {userRating && (
                  <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                    <div className="text-xs font-mono text-emerald-700">Your Evaluation</div>
                    <div className="text-xl font-mono font-bold text-slate-900 tabular-nums">
                      {userRating.toFixed(2)}★
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Criteria Evaluation */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Evaluate This Architecture (Tap Stars to Rate)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Code Quality */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-900 flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-slate-700" /> Code Architecture
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                        {criteria.codeQuality.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleCriteriaRate("codeQuality", star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={cn(
                              "w-4 h-4",
                              criteria.codeQuality >= star
                                ? "fill-amber-500 text-amber-500"
                                : "fill-slate-100 text-slate-300"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-900 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-600" /> Performance &amp; Latency
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-700 tabular-nums">
                        {criteria.performance.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleCriteriaRate("performance", star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={cn(
                              "w-4 h-4",
                              criteria.performance >= star
                                ? "fill-amber-500 text-amber-500"
                                : "fill-slate-100 text-slate-300"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Craft */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-600" /> Visual Craft &amp; UX
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-700 tabular-nums">
                        {criteria.design.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleCriteriaRate("design", star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={cn(
                              "w-4 h-4",
                              criteria.design >= star
                                ? "fill-amber-500 text-amber-500"
                                : "fill-slate-100 text-slate-300"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Documentation */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-900 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-600" /> Documentation &amp; Tests
                      </span>
                      <span className="text-xs font-mono font-bold text-indigo-700 tabular-nums">
                        {criteria.documentation.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleCriteriaRate("documentation", star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={cn(
                              "w-4 h-4",
                              criteria.documentation >= star
                                ? "fill-amber-500 text-amber-500"
                                : "fill-slate-100 text-slate-300"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Comments & Peer Discussion */}
          {activeTab === "discussion" && (
            <div className="space-y-6">
              {/* Comment Input */}
              <form onSubmit={handleCommentSubmit} className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="Leave technical critique, query architectural choices, or compliment craft..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white resize-none transition-colors"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Markdown supported • Constructive peer review enforced
                    </span>
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-900 hover:bg-neutral-800 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Post Critique</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Comment Threads */}
              <div className="space-y-3">
                {portfolio.comments.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                    No critique posted yet. Initiate the peer review dialogue!
                  </div>
                ) : (
                  portfolio.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={comment.authorAvatar}
                            alt={comment.authorName}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                          />
                          <span className="text-xs font-semibold text-slate-900">
                            {comment.authorName}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            @{comment.authorUsername}
                          </span>
                          <span className="text-slate-300 text-xs">•</span>
                          <span className="text-[11px] text-slate-400">
                            {timeAgo(comment.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleReportComment(comment.id)}
                            className={cn(
                              "p-1 rounded-md text-slate-400 hover:text-slate-700 text-xs transition-colors cursor-pointer",
                              reportedComments[comment.id] && "text-rose-500 pointer-events-none"
                            )}
                            title={reportedComments[comment.id] ? "Reported to moderator" : "Report comment"}
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>

                          {(comment.isUserOwner || comment.authorUsername === "arneldev") && (
                            <button
                              type="button"
                              onClick={() => onDeleteComment(portfolio.id, comment.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 text-xs transition-colors cursor-pointer"
                              title="Delete comment"
                              aria-label="Delete your comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed pl-8">
                        {comment.content}
                      </p>

                      {reportedComments[comment.id] && (
                        <div className="pl-8 text-[11px] font-mono text-rose-600">
                          ✓ Comment flagged for moderator review.
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px]">
            Registry ID: {portfolio.id} • Indexed {timeAgo(portfolio.createdAt)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors font-medium text-xs cursor-pointer"
          >
            Close Blueprint
          </button>
        </div>

      </motion.div>
    </div>
  );
}
