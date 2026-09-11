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
  Award, 
  Flame, 
  CheckCircle2, 
  ShieldCheck,
  Cpu,
  Layers,
  Zap,
  BookOpen
} from "lucide-react";
import { Portfolio, CommentItem, RatingBreakdown } from "@/types/portfolio";
import { RatingWidget } from "./RatingWidget";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

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

  // Multi-criteria rating interactive state
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
      if (portfolio.ratingBreakdown) {
        setCriteria(portfolio.ratingBreakdown);
      }
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
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(portfolio.id, commentText.trim());
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
  };

  const handleReportComment = (commentId: string) => {
    setReportedComments((prev) => ({ ...prev, [commentId]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-surface-raised">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted uppercase tracking-wider">
              Portfolio Inspection
            </span>
            <span className="text-muted-dark">•</span>
            <span className="text-xs font-mono text-brand-400">
              {portfolio.category}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Showcase Banner if present */}
          {portfolio.isShowcase && (
            <div className="p-3.5 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-start gap-3">
              <div className="p-1 rounded bg-brand-500/20 text-brand-400">
                <Flame className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <strong className="text-brand-300 font-semibold block">
                  {portfolio.showcaseType === "daily" ? "Daily Showcase Spotlight" : "Weekly Showcase Winner"}
                </strong>
                <p className="text-muted mt-0.5 leading-relaxed">
                  {portfolio.showcaseReason}
                </p>
              </div>
            </div>
          )}

          {/* Project Title & Author Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                {portfolio.title}
              </h2>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                {portfolio.tagline}
              </p>
            </div>

            {/* Quick Action Links */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {portfolio.githubUrl && (
                <a
                  href={portfolio.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-surface-raised hover:bg-surface-overlay text-foreground border border-border hover:border-border-hover text-xs font-medium transition-colors"
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
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-brand-500 hover:bg-brand-400 text-background text-xs font-semibold shadow-sm transition-all hover:shadow-glow"
                >
                  <span>Launch Live</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Author Card */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-surface-raised border border-border">
            <div className="flex items-center gap-3">
              <img
                src={portfolio.author.avatar}
                alt={portfolio.author.name}
                className="w-10 h-10 rounded-full object-cover border border-border"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground">{portfolio.author.name}</span>
                  {portfolio.author.isVerified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
                  )}
                  <span className="text-xs font-mono text-muted">@{portfolio.author.username}</span>
                </div>
                <div className="text-xs text-muted">{portfolio.author.role}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer",
                  isLiked
                    ? "bg-accent-rose/10 border-accent-rose/40 text-accent-rose"
                    : "bg-surface border-border text-muted hover:text-foreground"
                )}
              >
                <Heart className={cn("w-4 h-4", isLiked && "fill-accent-rose text-accent-rose")} />
                <span className="font-mono tabular-nums">{formatNumber(likesCount)}</span>
              </button>
            </div>
          </div>

          {/* Project Screenshot / Media preview */}
          <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden border border-border bg-surface-raised">
            <img
              src={portfolio.thumbnail}
              alt={portfolio.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Navigation Tabs inside Modal */}
          <div className="flex items-center gap-2 border-b border-border/80 pb-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeTab === "overview"
                  ? "bg-surface-raised text-foreground border border-border"
                  : "text-muted hover:text-foreground"
              )}
            >
              Overview & Architecture
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                activeTab === "reviews"
                  ? "bg-surface-raised text-foreground border border-border"
                  : "text-muted hover:text-foreground"
              )}
            >
              <Star className="w-3.5 h-3.5 text-brand-400" />
              Peer Reviews & Ratings ({portfolio.ratingCount})
            </button>
            <button
              onClick={() => setActiveTab("discussion")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                activeTab === "discussion"
                  ? "bg-surface-raised text-foreground border border-border"
                  : "text-muted hover:text-foreground"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Discussion ({portfolio.comments.length})
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-mono uppercase text-muted tracking-wider mb-2">
                  Technical Architecture
                </h4>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line bg-surface-raised/50 p-4 rounded-lg border border-border/60">
                  {portfolio.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase text-muted tracking-wider mb-2">
                  Technologies & Standards
                </h4>
                <div className="flex flex-wrap gap-2">
                  {portfolio.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-1 rounded-md bg-surface-raised border border-border text-foreground text-xs font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Reviews & Multi-Criteria Rating */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              {/* Aggregate Score Card */}
              <div className="p-4 rounded-lg bg-surface-raised border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-brand-400 tabular-nums">
                      {portfolio.rating.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">out of 5.0</div>
                  </div>
                  <div className="border-l border-border pl-4 space-y-1">
                    <RatingWidget
                      currentRating={portfolio.rating}
                      ratingCount={portfolio.ratingCount}
                      interactive={false}
                    />
                    <div className="text-[11px] text-muted">
                      Aggregated across {portfolio.ratingCount} verified developer evaluations
                    </div>
                  </div>
                </div>

                {userRating && (
                  <div className="text-right sm:border-l sm:border-border sm:pl-4">
                    <div className="text-xs font-mono text-accent-emerald">Your Score</div>
                    <div className="text-xl font-mono font-bold text-foreground tabular-nums">
                      {userRating.toFixed(2)}★
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Peer Evaluation Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase text-muted tracking-wider">
                  Evaluate This Portfolio (Click Stars to Rate)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Code Quality */}
                  <div className="p-3.5 rounded-lg bg-surface-raised border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-brand-400" /> Code Architecture
                      </span>
                      <span className="text-xs font-mono font-bold text-brand-400 tabular-nums">
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
                                ? "fill-brand-500 text-brand-500"
                                : "fill-surface text-muted-dark"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="p-3.5 rounded-lg bg-surface-raised border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-accent-emerald" /> Performance & Latency
                      </span>
                      <span className="text-xs font-mono font-bold text-brand-400 tabular-nums">
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
                                ? "fill-brand-500 text-brand-500"
                                : "fill-surface text-muted-dark"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual UX */}
                  <div className="p-3.5 rounded-lg bg-surface-raised border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-cyan-400" /> Visual Craft & UX
                      </span>
                      <span className="text-xs font-mono font-bold text-brand-400 tabular-nums">
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
                                ? "fill-brand-500 text-brand-500"
                                : "fill-surface text-muted-dark"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Documentation */}
                  <div className="p-3.5 rounded-lg bg-surface-raised border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-purple-400" /> Documentation & Tests
                      </span>
                      <span className="text-xs font-mono font-bold text-brand-400 tabular-nums">
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
                                ? "fill-brand-500 text-brand-500"
                                : "fill-surface text-muted-dark"
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

          {/* Tab 3: Comments & Discussion */}
          {activeTab === "discussion" && (
            <div className="space-y-6">
              {/* Add Comment Input Form */}
              <form onSubmit={handleCommentSubmit} className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="Leave technical feedback, question architecture decisions, or praise craft..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full bg-surface-raised border border-border rounded-lg p-3 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-brand-500/50 resize-none transition-colors"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-muted-dark font-mono">
                      Markdown supported • Peer critique rules apply
                    </span>
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:pointer-events-none text-background text-xs font-medium transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Comment</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Comment Thread List */}
              <div className="space-y-3">
                {portfolio.comments.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-lg text-muted text-xs">
                    No comments yet. Start the architectural discussion!
                  </div>
                ) : (
                  portfolio.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3.5 rounded-lg bg-surface-raised border border-border/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={comment.authorAvatar}
                            alt={comment.authorName}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-xs font-semibold text-foreground">
                            {comment.authorName}
                          </span>
                          <span className="text-[11px] font-mono text-muted">
                            @{comment.authorUsername}
                          </span>
                          <span className="text-muted-dark text-xs">•</span>
                          <span className="text-[11px] text-muted">
                            {timeAgo(comment.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Report Button */}
                          <button
                            type="button"
                            onClick={() => handleReportComment(comment.id)}
                            className={cn(
                              "p-1 rounded text-muted hover:text-foreground text-xs transition-colors",
                              reportedComments[comment.id] && "text-accent-rose pointer-events-none"
                            )}
                            title={reportedComments[comment.id] ? "Reported to moderator" : "Report comment"}
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete own comment */}
                          {comment.isUserOwner && (
                            <button
                              type="button"
                              onClick={() => onDeleteComment(portfolio.id, comment.id)}
                              className="p-1 rounded text-muted hover:text-accent-rose text-xs transition-colors"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-foreground/90 leading-relaxed pl-8">
                        {comment.content}
                      </p>

                      {reportedComments[comment.id] && (
                        <div className="pl-8 text-[11px] font-mono text-accent-rose">
                          ✓ Comment flagged for moderator review (PRD Section 4.5).
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/80 bg-surface-raised flex items-center justify-between text-xs text-muted">
          <span className="font-mono text-[11px]">
            ID: {portfolio.id} • Submitted {timeAgo(portfolio.createdAt)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-surface border border-border text-foreground hover:bg-surface-overlay transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
