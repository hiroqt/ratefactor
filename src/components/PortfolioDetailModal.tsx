"use client";

import React, { useState, useEffect, useRef } from "react";
import { useModalSmoothScroll } from "@/hooks/useModalSmoothScroll";
import { 
  X, 
  ExternalLink, 
  Github, 
  Google, 
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
  Award, 
  AlertCircle 
} from "@/components/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { Portfolio, CommentItem, RatingBreakdown, CritiqueTag, CRITIQUE_TAG_CONFIG } from "@/types/portfolio";
import { RatingWidget } from "./RatingWidget";
import { cn, formatNumber, timeAgo, formatRating, normalizeAvatarUrl } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { validateCommentContent, MIN_COMMENT_LENGTH } from "@/lib/guardrails";
import { EmojiReaction } from "@/components/ui/emoji-reaction";
import { EMOJI_MAP, getEmojiDisplay } from "@/lib/emoji-utils";

export { EMOJI_MAP, getEmojiDisplay };

// Starting position for the "tap stars to rate" inputs before any real rating
// exists for this viewer. These are editable input defaults only — never
// written to the portfolio's aggregate rating/breakdown before submission.
const DEFAULT_CRITERIA: RatingBreakdown = {
  codeQuality: 5,
  performance: 5,
  design: 4.8,
  documentation: 5,
};

interface PortfolioDetailModalProps {
  portfolio: Portfolio | null;
  onClose: () => void;
  onLikeToggle: (id: string, liked: boolean) => void;
  onReact?: (id: string, emojiName: string) => void;
  onAddComment: (portfolioId: string, content: string, critiqueTag?: CritiqueTag | null) => void;
  onDeleteComment: (portfolioId: string, commentId: string) => void;
  onRatePortfolio: (portfolioId: string, rating: number, breakdown: RatingBreakdown) => void;
  currentUser?: any;
  onRequireAuth?: (intent: string) => void;
}

export function PortfolioDetailModal({
  portfolio,
  onClose,
  onLikeToggle,
  onReact,
  onAddComment,
  onDeleteComment,
  onRatePortfolio,
  currentUser,
  onRequireAuth,
}: PortfolioDetailModalProps) {
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [selectedCritiqueTag, setSelectedCritiqueTag] = useState<CritiqueTag | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [reportedComments, setReportedComments] = useState<Record<string, boolean>>({});
  const [commentsList, setCommentsList] = useState<CommentItem[]>(portfolio?.comments || []);
  const [activeTab, setActiveTab] = useState<"overview" | "reviews" | "discussion">("overview");

  const modalRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [criteria, setCriteria] = useState<RatingBreakdown>(DEFAULT_CRITERIA);

  useEffect(() => {
    if (portfolio) {
      setIsLiked(portfolio.isLiked || false);
      setLikesCount(portfolio.likesCount);
      setUserRating(portfolio.userRating || null);
      setCommentsList(portfolio.comments || []);
      if (portfolio.userRatingBreakdown) {
        setCriteria(portfolio.userRatingBreakdown);
      } else if (portfolio.ratingCount > 0 && portfolio.ratingBreakdown) {
        setCriteria(portfolio.ratingBreakdown);
      } else {
        // Unrated portfolio with no existing user rating: seed the editable
        // stars with valid 1-5 defaults so the first click doesn't submit
        // fabricated 0s for the untouched dimensions. Never affects the
        // displayed aggregate score, which reads portfolio.rating directly.
        setCriteria(DEFAULT_CRITERIA);
      }
      setCommentText("");
      trackEvent("portfolio_view", {
        portfolioId: portfolio.id,
        title: portfolio.title,
        category: portfolio.category,
      });

      // Ensure fresh approved comments are pulled directly from server
      fetch(`/api/portfolios/${portfolio.id}/comments`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.comments && Array.isArray(data.comments)) {
            setCommentsList(data.comments);
          }
        })
        .catch(() => {});
    }
  }, [portfolio]);

  // Handle ESC key & lock body scrolling
  useEffect(() => {
    if (!portfolio) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [portfolio, onClose]);

  useModalSmoothScroll({
    isOpen: !!portfolio,
    modalRef,
    scrollRef,
    deps: [activeTab, portfolio?.id],
  });

  if (!portfolio) return null;

  const isOwnPortfolio = Boolean(
    currentUser?.username &&
    portfolio.author?.username &&
    currentUser.username.toLowerCase() === portfolio.author.username.toLowerCase()
  );

  const handleLike = () => {
    if (!currentUser) {
      onRequireAuth?.("Sign in with Google or GitHub to heart and like portfolios.");
      return;
    }
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

  const handleReact = (emojiName: string) => {
    if (!currentUser) {
      onRequireAuth?.("Sign in with Google or GitHub to react to developer portfolios.");
      return;
    }
    if (onReact) {
      onReact(portfolio.id, emojiName);
    } else {
      if (!isLiked) {
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
        onLikeToggle(portfolio.id, true);
      }
    }
    trackEvent("portfolio_reaction", {
      portfolioId: portfolio.id,
      reaction: emojiName,
    });
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);

    if (!currentUser) {
      onRequireAuth?.("Sign in with Google or GitHub to submit critique and join the discussion.");
      return;
    }

    if (!commentText.trim()) return;

    // Strict guardrails check
    const check = validateCommentContent(commentText);
    if (!check.isValid) {
      setCommentError(check.error || `Comments must be at least ${MIN_COMMENT_LENGTH} characters of constructive feedback.`);
      return;
    }

    const optimisticComment: CommentItem = {
      id: "comment-" + Date.now(),
      authorName: currentUser.name || "Developer",
      authorUsername: currentUser.username || "dev",
      authorAvatar:
        currentUser.avatar ||
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
      isUserOwner: true,
      critiqueTag: selectedCritiqueTag || null,
    };
    setCommentsList((prev) => [optimisticComment, ...prev]);

    onAddComment(portfolio.id, commentText.trim(), selectedCritiqueTag);
    trackEvent("portfolio_comment", {
      portfolioId: portfolio.id,
      critiqueTag: selectedCritiqueTag,
    });
    setCommentText("");
    setSelectedCritiqueTag(null);
  };

  const handleCriteriaRate = (key: keyof RatingBreakdown, value: number) => {
    if (!currentUser) {
      onRequireAuth?.("Sign in with Google or GitHub to rate developer portfolios.");
      return;
    }
    if (isOwnPortfolio) return;
    const next = { ...criteria, [key]: value };
    setCriteria(next);
    const avg = Number(
      ((next.design + next.codeQuality + next.performance + next.documentation) / 4).toFixed(2)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 overflow-hidden">
      {/* Deep Occluding Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md modal-backdrop transition-opacity" 
        onClick={onClose}
      />

      {/* Editorial Sheet Modal */}
      <motion.div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="portfolio-modal-title"
        data-lenis-prevent="true"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-[#121215] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular Edge */}
        <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/20 to-transparent pointer-events-none" />

        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-zinc-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Architecture Analysis
            </span>
            <span className="text-slate-300 dark:text-zinc-600">•</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 font-medium">
              {portfolio.category}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div ref={scrollRef} data-lenis-prevent="true" className="flex-1 overflow-y-auto overscroll-contain scroll-smooth p-4 sm:p-6 space-y-5">
          
          {/* Top Showcase Spotlight Banner if present */}
          {portfolio.isShowcase && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex-shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <strong className="text-amber-900 dark:text-amber-200 font-semibold text-sm block">
                  {portfolio.showcaseType === "daily" ? "Daily Showcase Spotlight" : "Weekly Showcase Champion"}
                </strong>
                <p className="text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  {portfolio.showcaseReason}
                </p>
              </div>
            </div>
          )}

          {/* Roast / In-Depth Critique Beacon Banner */}
          {portfolio.requestCritique && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 flex-shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <strong className="text-orange-900 dark:text-orange-200 font-semibold text-sm block flex items-center gap-1.5">
                  <span>🔥 Roast / In-Depth Critique Requested</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                </strong>
                <p className="text-orange-800 dark:text-orange-300/90 mt-0.5 leading-relaxed">
                  The author specifically invites rigorous, constructive feedback, UX tear-downs, and architectural reviews.
                </p>
              </div>
            </div>
          )}

          {/* Project Title & Author Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h2 id="portfolio-modal-title" className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
                {portfolio.title}
              </h2>
              <p className="text-base sm:text-[19px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-normal">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-medium border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                </a>
              )}

              {portfolio.portfolioUrl && (
                <a
                  href={portfolio.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold shadow-xs transition-all"
                >
                  <span>Launch Live</span>
                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                </a>
              )}
            </div>
          </div>

          {/* Author Card */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={normalizeAvatarUrl(portfolio.author.avatar, portfolio.author.username)}
                alt={portfolio.author.name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-zinc-700 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80";
                }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{portfolio.author.name}</span>
                  {portfolio.author.isVerified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  <span className="text-xs font-mono text-slate-500 dark:text-zinc-400 truncate">@{portfolio.author.username}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400 truncate">{portfolio.author.role}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0 flex-wrap">
              {/* Active Emoji Badges with counts if > 0 */}
              {portfolio.reactions &&
                Object.entries(portfolio.reactions)
                  .filter(([_, count]) => count > 0)
                  .map(([emoji, count]) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReact(emoji)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-mono transition-all cursor-pointer",
                        portfolio.userReaction === emoji
                          ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-zinc-900 shadow-xs"
                          : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700"
                      )}
                      title={`Reacted ${getEmojiDisplay(emoji)} (${count})`}
                    >
                      <span className="text-sm">{getEmojiDisplay(emoji)}</span>
                      <span className="tabular-nums font-semibold">{count}</span>
                    </button>
                  ))}

              {/* Main Reaction Trigger */}
              <EmojiReaction
                size="md"
                align="right"
                asChild
                onReact={handleReact}
              >
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer",
                    isLiked
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-xs font-semibold"
                      : "bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700"
                  )}
                  aria-label="React to architecture"
                >
                  <span className="text-sm">{getEmojiDisplay(portfolio.userReaction || "star-struck")}</span>
                  {likesCount > 0 ? (
                    <span className="font-mono tabular-nums font-semibold">{formatNumber(likesCount)}</span>
                  ) : (
                    <span className="font-medium text-slate-600 dark:text-zinc-400">React</span>
                  )}
                </button>
              </EmojiReaction>
            </div>
          </div>

          {/* Project Media Preview */}
          <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-zinc-900 shadow-sm">
            <img
              src={portfolio.thumbnail}
              alt={portfolio.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-white/10 pb-2 overflow-x-auto no-scrollbar scrollbar-none">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0",
                activeTab === "overview"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
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
                  ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
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
                  ? "bg-slate-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span>Discussion ({commentsList.length > 0 ? commentsList.length : portfolio.commentsCount})</span>
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-mono uppercase text-slate-500 dark:text-zinc-400 tracking-wider mb-2">
                  Technical Architecture &amp; Execution
                </h4>
                <p className="text-base sm:text-[19px] text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-zinc-900/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 font-normal">
                  {portfolio.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase text-slate-500 dark:text-zinc-400 tracking-wider mb-2">
                  Technologies &amp; Frameworks
                </h4>
                <div className="flex flex-wrap gap-2">
                  {portfolio.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-mono font-medium"
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
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-amber-800 dark:text-amber-400 tabular-nums">
                      {portfolio.ratingCount > 0 ? portfolio.rating.toFixed(2) : "—"}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">out of 5.0</div>
                  </div>
                  <div className="border-l border-slate-200 dark:border-zinc-700 pl-4 space-y-1">
                    <RatingWidget
                      currentRating={portfolio.rating}
                      ratingCount={portfolio.ratingCount}
                      breakdown={portfolio.ratingBreakdown}
                      interactive={false}
                    />
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                      {portfolio.ratingCount > 0
                        ? `Aggregated across ${portfolio.ratingCount} peer critiques`
                        : "Be the first to submit a genuine peer critique."}
                    </div>
                  </div>
                </div>

                {userRating && (
                  <div className="text-right sm:border-l sm:border-slate-200 dark:sm:border-zinc-700 sm:pl-4">
                    <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400">Your Evaluation</div>
                    <div className="text-xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {userRating.toFixed(2)}★
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Criteria Evaluation */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase text-slate-500 dark:text-zinc-400 tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Evaluate This Architecture (Tap Stars to Rate)
                </h4>

                {isOwnPortfolio && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 text-xs">
                    You cannot rate your own portfolio.
                  </div>
                )}

                <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3", isOwnPortfolio && "opacity-50 pointer-events-none")}>
                  {[
                    {
                      key: "design" as const,
                      label: "Design & UI/UX",
                      score: criteria.design,
                      icon: Layers,
                      accentBg: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
                      accentScoreBg: "bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
                      barGradient: "from-amber-500 to-amber-400",
                      starActive: "fill-amber-500 text-amber-500",
                    },
                    {
                      key: "codeQuality" as const,
                      label: "Code Architecture",
                      score: criteria.codeQuality,
                      icon: Cpu,
                      accentBg: "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
                      accentScoreBg: "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
                      barGradient: "from-indigo-500 to-indigo-400",
                      starActive: "fill-indigo-500 text-indigo-500",
                    },
                    {
                      key: "performance" as const,
                      label: "Performance & Latency",
                      score: criteria.performance,
                      icon: Zap,
                      accentBg: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                      accentScoreBg: "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
                      barGradient: "from-emerald-500 to-emerald-400",
                      starActive: "fill-emerald-500 text-emerald-500",
                    },
                    {
                      key: "documentation" as const,
                      label: "Documentation",
                      score: criteria.documentation ?? 5.0,
                      icon: BookOpen,
                      accentBg: "bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400",
                      accentScoreBg: "bg-sky-500/10 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20",
                      barGradient: "from-sky-500 to-sky-400",
                      starActive: "fill-sky-500 text-sky-500",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const currentVal = item.score;
                    return (
                      <div
                        key={item.key}
                        className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-white/10 space-y-2.5 transition-all hover:border-slate-300 dark:hover:border-white/20 hover:shadow-xs group"
                      >
                        {/* Header: Icon + Category Name + Score Pill */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className={cn("p-1 rounded-md shrink-0", item.accentBg)}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {item.label}
                            </span>
                          </div>
                          <div className={cn("flex items-baseline gap-0.5 px-2 py-0.5 rounded-md font-mono text-xs font-bold border tabular-nums shrink-0", item.accentScoreBg)}>
                            <span>{currentVal.toFixed(1)}</span>
                            <span className="text-[10px] opacity-70 font-normal">/5.0</span>
                          </div>
                        </div>

                        {/* Interactive 5-Star Row */}
                        <div className="flex items-center justify-between pt-0.5">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleCriteriaRate(item.key, star)}
                                className="p-0.5 hover:scale-125 transition-transform cursor-pointer focus:outline-none"
                                aria-label={`Rate ${item.label} ${star} stars`}
                              >
                                <Star
                                  className={cn(
                                    "w-4 h-4 transition-colors",
                                    currentVal >= star
                                      ? item.starActive
                                      : "fill-slate-100 dark:fill-zinc-800 text-slate-300 dark:text-zinc-700"
                                  )}
                                />
                              </button>
                            ))}
                          </div>

                          {/* Micro score percentage badge */}
                          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 font-medium">
                            {Math.round((currentVal / 5) * 100)}%
                          </span>
                        </div>

                        {/* Micro Progress Track */}
                        <div className="w-full h-1 rounded-full bg-slate-200/60 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-300", item.barGradient)}
                            style={{ width: `${Math.min(100, Math.max(0, (currentVal / 5) * 100))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Comments & Peer Discussion */}
          {activeTab === "discussion" && (
            <div className="space-y-6">
              {/* Comment Input */}
              <form onSubmit={handleCommentSubmit} className="space-y-3">
                {commentError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{commentError}</span>
                  </div>
                )}

                {!currentUser && (
                  <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <span>You are browsing as a guest. Sign in to post peer critiques and rating breakdown.</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRequireAuth?.("Sign in with Google to join developer discussions.")}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-medium text-[11px] inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Google className="w-3 h-3" />
                        <span>Continue with Google</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequireAuth?.("Sign in with GitHub to join developer discussions.")}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-white font-medium text-[11px] inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Github className="w-3 h-3" />
                        <span>Continue with GitHub</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Critique Category Tag Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Feedback Category (Optional):
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(Object.keys(CRITIQUE_TAG_CONFIG) as CritiqueTag[]).map((tagKey) => {
                      const cfg = CRITIQUE_TAG_CONFIG[tagKey];
                      const isSelected = selectedCritiqueTag === tagKey;
                      return (
                        <button
                          key={tagKey}
                          type="button"
                          onClick={() =>
                            setSelectedCritiqueTag((prev) => (prev === tagKey ? null : tagKey))
                          }
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all cursor-pointer border",
                            isSelected
                              ? cn(cfg.badgeClass, "ring-2 ring-slate-900 dark:ring-white ring-offset-1 dark:ring-offset-zinc-900 font-semibold shadow-xs")
                              : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700"
                          )}
                        >
                          <span>{cfg.emoji}</span>
                          <span>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder={
                      currentUser
                        ? "Leave technical critique, query architectural choices, or compliment craft (min 10 characters)..."
                        : "Sign in with Google or GitHub to post comments and join technical critique..."
                    }
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl p-3.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-zinc-800 resize-none transition-colors"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                      Markdown supported • Constructive peer review enforced
                    </span>
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none text-white dark:text-zinc-900 text-xs font-semibold shadow-md transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Post Critique</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Comment Threads */}
              <div className="space-y-3">
                {commentsList.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-400 dark:text-zinc-500 text-xs">
                    No critique posted yet. Initiate the peer review dialogue!
                  </div>
                ) : (
                  commentsList.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <img
                            src={normalizeAvatarUrl(comment.authorAvatar, comment.authorUsername)}
                            alt={comment.authorName}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 dark:ring-zinc-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80";
                            }}
                          />
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {comment.authorName}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                            @{comment.authorUsername}
                          </span>
                          <span className="text-slate-300 dark:text-zinc-600 text-xs">•</span>
                          <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                            {timeAgo(comment.createdAt)}
                          </span>

                          {comment.critiqueTag && CRITIQUE_TAG_CONFIG[comment.critiqueTag] && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border font-medium",
                                CRITIQUE_TAG_CONFIG[comment.critiqueTag].badgeClass
                              )}
                            >
                              <span>{CRITIQUE_TAG_CONFIG[comment.critiqueTag].emoji}</span>
                              <span>{CRITIQUE_TAG_CONFIG[comment.critiqueTag].label}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleReportComment(comment.id)}
                            className={cn(
                              "p-1 rounded-md text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 text-xs transition-colors cursor-pointer",
                              reportedComments[comment.id] && "text-rose-500 pointer-events-none"
                            )}
                            title={reportedComments[comment.id] ? "Reported to moderator" : "Report comment"}
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>

                          {(comment.isUserOwner || 
                            (currentUser && (
                              currentUser.username === comment.authorUsername || 
                              currentUser.role === "moderator" || 
                              currentUser.role === "admin"
                            ))) && (
                            <button
                              type="button"
                              onClick={() => {
                                setCommentsList((prev) => prev.filter((c) => c.id !== comment.id));
                                onDeleteComment(portfolio.id, comment.id);
                              }}
                              className="p-1 rounded-md text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 text-xs transition-colors cursor-pointer"
                              title="Delete comment"
                              aria-label="Delete your comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed pl-8">
                        {comment.content}
                      </p>

                      {reportedComments[comment.id] && (
                        <div className="pl-8 text-[11px] font-mono text-rose-600 dark:text-rose-400">
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
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-zinc-900/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 shrink-0">
          <span className="font-mono text-[11px]">
            Registry ID: {portfolio.id} • Indexed {timeAgo(portfolio.createdAt)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition-colors font-medium text-xs cursor-pointer"
          >
            Close Blueprint
          </button>
        </div>

      </motion.div>
    </div>
  );
}
