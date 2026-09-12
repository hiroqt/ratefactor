"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Portfolio,
  PortfolioCategory,
  SortOption,
  RatingBreakdown,
  CommentItem,
  NotificationItem,
} from "@/types/portfolio";
import { INITIAL_PORTFOLIOS } from "@/data/mockPortfolios";
import {
  selectShowcaseCandidate,
  DEFAULT_SHOWCASE_WEIGHTS,
} from "@/lib/showcaseAlgorithm";
import { trackEvent } from "@/lib/analytics";
import { AuthUser } from "@/features/auth/hooks/useAuth";

export interface UsePortfoliosOptions {
  currentUser?: AuthUser | null;
  currentUsername?: string;
  onRequireAuth?: (intent: string) => void;
  onNotify?: (notification: NotificationItem) => void;
  onToast?: (message: string) => void;
  onAutoPin?: (portfolio: Portfolio) => void;
  onUnpin?: (portfolioId: string) => void;
}

export function usePortfolios(options?: UsePortfoliosOptions) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ratefactor_portfolios");
        if (saved) {
          const parsed = JSON.parse(saved);
          // Purge legacy dummy portfolios if present in client localStorage
          if (
            Array.isArray(parsed) &&
            parsed.some(
              (p: any) =>
                p.id === "hyperion-lsm" ||
                p.id === "kubelens-tui" ||
                p.id === "zenith-state"
            )
          ) {
            localStorage.removeItem("ratefactor_portfolios");
            return [];
          }
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_PORTFOLIOS;
  });

  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<PortfolioCategory>("All");
  const [activeSort, setActiveSort] = useState<SortOption>("highest_rated");
  const [showcaseHistoryIds, setShowcaseHistoryIds] = useState<string[]>([]);

  // Persist portfolios changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("ratefactor_portfolios", JSON.stringify(portfolios));
    } catch (e) {}
  }, [portfolios]);

  // Daily & Weekly showcases
  const dailyShowcase = useMemo(() => {
    return portfolios.find((p) => p.showcaseType === "daily") || portfolios[0] || null;
  }, [portfolios]);

  const weeklyShowcase = useMemo(() => {
    return (
      portfolios.find((p) => p.showcaseType === "weekly") ||
      portfolios[1] ||
      portfolios[0] ||
      null
    );
  }, [portfolios]);

  // User's own portfolios
  const myPortfolios = useMemo(() => {
    const username = options?.currentUsername || options?.currentUser?.username;
    if (!username) return [];
    return portfolios.filter(
      (p) =>
        (options?.currentUser?.username && p.author.username === options.currentUser.username) ||
        p.author.username === username
    );
  }, [portfolios, options?.currentUsername, options?.currentUser]);

  // Like toggle
  const handleLikeToggle = useCallback(
    (portfolioId: string, isLiked: boolean) => {
      if (!options?.currentUser) {
        options?.onRequireAuth?.("Sign in with GitHub or Email to heart and like portfolios.");
        return;
      }

      setPortfolios((prev) =>
        prev.map((p) => {
          if (p.id === portfolioId) {
            const nextCount = isLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1);
            const updated = {
              ...p,
              isLiked,
              likesCount: nextCount,
            };
            if (selectedPortfolio && selectedPortfolio.id === portfolioId) {
              setSelectedPortfolio(updated);
            }
            return updated;
          }
          return p;
        })
      );

      if (isLiked) {
        const target = portfolios.find((p) => p.id === portfolioId);
        if (target) {
          const isTargetAuthorMe =
            Boolean((options?.currentUser?.username || options?.currentUsername) &&
            target.author.username === (options?.currentUser?.username || options?.currentUsername));
          const newNotif: NotificationItem = {
            id: "notif-like-" + Date.now(),
            type: "like",
            actorName: options?.currentUser?.name || "Developer",
            actorAvatar:
              options?.currentUser?.avatar ||
              "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
            portfolioId: target.id,
            portfolioTitle: target.title,
            message: isTargetAuthorMe ? "liked your portfolio." : `appreciated ${target.title}.`,
            timestamp: new Date().toISOString(),
            isRead: false,
          };
          options?.onNotify?.(newNotif);
        }
      }
    },
    [options, portfolios, selectedPortfolio]
  );

  // Rate portfolio
  const handleRatePortfolio = useCallback(
    (portfolioId: string, ratingScore: number, breakdown: RatingBreakdown) => {
      if (!options?.currentUser) {
        options?.onRequireAuth?.("Sign in with GitHub or Email to rate developer portfolios.");
        return;
      }

      setPortfolios((prev) =>
        prev.map((p) => {
          if (p.id === portfolioId) {
            const hasUserRated = Boolean(p.userRating);
            const newCount = hasUserRated ? p.ratingCount : p.ratingCount + 1;
            const oldPoints = p.rating * p.ratingCount;
            const prevScore = p.userRating || 0;
            const newPoints = hasUserRated
              ? oldPoints - prevScore + ratingScore
              : oldPoints + ratingScore;
            const newAvg = Number((newPoints / Math.max(1, newCount)).toFixed(2));
            const boundedAvg = Math.min(5, Math.max(1, newAvg));

            const prevUserBreakdown = p.userRatingBreakdown || {
              codeQuality: prevScore,
              performance: prevScore,
              design: prevScore,
            };

            const calcNewCriterion = (
              communityAvg: number,
              newVal: number,
              prevVal: number
            ) => {
              const tot = (communityAvg || 5) * p.ratingCount;
              const updatedTot = hasUserRated ? tot - prevVal + newVal : tot + newVal;
              return Number((updatedTot / Math.max(1, newCount)).toFixed(2));
            };

            const updatedBreakdown: RatingBreakdown = {
              design: calcNewCriterion(
                p.ratingBreakdown.design,
                breakdown.design,
                prevUserBreakdown.design
              ),
              codeQuality: calcNewCriterion(
                p.ratingBreakdown.codeQuality,
                breakdown.codeQuality,
                prevUserBreakdown.codeQuality
              ),
              performance: calcNewCriterion(
                p.ratingBreakdown.performance,
                breakdown.performance,
                prevUserBreakdown.performance
              ),
            };

            const updated: Portfolio = {
              ...p,
              rating: boundedAvg,
              ratingCount: newCount,
              userRating: ratingScore,
              ratingBreakdown: updatedBreakdown,
              userRatingBreakdown: breakdown,
            };

            if (selectedPortfolio && selectedPortfolio.id === portfolioId) {
              setSelectedPortfolio(updated);
            }

            return updated;
          }
          return p;
        })
      );

      options?.onToast?.(`Your rating (${ratingScore.toFixed(1)}★) has been logged.`);

      const target = portfolios.find((p) => p.id === portfolioId);
      if (target) {
        const isTargetAuthorMe =
          target.author.username === (options?.currentUser?.username || "arneldev");
        const newNotif: NotificationItem = {
          id: "notif-rate-" + Date.now(),
          type: "rating",
          actorName: options?.currentUser?.name || "Developer",
          actorAvatar:
            options?.currentUser?.avatar ||
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
          portfolioId: target.id,
          portfolioTitle: target.title,
          message: isTargetAuthorMe
            ? `evaluated your portfolio with ${ratingScore.toFixed(1)}★ peer score.`
            : `submitted a ${ratingScore.toFixed(1)}★ peer critique for ${target.title}.`,
          ratingScore,
          timestamp: new Date().toISOString(),
          isRead: false,
        };
        options?.onNotify?.(newNotif);
      }
    },
    [options, portfolios, selectedPortfolio]
  );

  // Add Comment
  const handleAddComment = useCallback(
    (portfolioId: string, content: string) => {
      if (!options?.currentUser) {
        options?.onRequireAuth?.("Sign in with GitHub or Email to post comments.");
        return;
      }

      const newComment: CommentItem = {
        id: "comment-" + Date.now(),
        authorName: options.currentUser.name || "Developer",
        authorUsername: options.currentUser.username || "dev",
        authorAvatar:
          options.currentUser.avatar ||
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
        content,
        createdAt: new Date().toISOString(),
        likes: 0,
        isUserOwner: true,
      };

      setPortfolios((prev) =>
        prev.map((p) => {
          if (p.id === portfolioId) {
            const updatedComments = [newComment, ...p.comments];
            return {
              ...p,
              comments: updatedComments,
              commentsCount: p.commentsCount + 1,
            };
          }
          return p;
        })
      );

      if (selectedPortfolio && selectedPortfolio.id === portfolioId) {
        setSelectedPortfolio((prev) =>
          prev
            ? {
                ...prev,
                comments: [newComment, ...prev.comments],
                commentsCount: prev.commentsCount + 1,
              }
            : null
        );
      }

      const target = portfolios.find((p) => p.id === portfolioId);
      if (target) {
        const myUname = options?.currentUser?.username || options?.currentUsername;
        const isTargetAuthorMe = Boolean(myUname && target.author.username === myUname);
        const newNotif: NotificationItem = {
          id: "notif-comment-" + Date.now(),
          type: "comment",
          actorName: options.currentUser.name || "Developer",
          actorAvatar:
            options.currentUser.avatar ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
          portfolioId: target.id,
          portfolioTitle: target.title,
          message: isTargetAuthorMe
            ? `commented on your project: "${content.slice(0, 45)}${content.length > 45 ? "..." : ""}"`
            : `commented on ${target.title}: "${content.slice(0, 45)}${content.length > 45 ? "..." : ""}"`,
          timestamp: new Date().toISOString(),
          isRead: false,
        };
        options?.onNotify?.(newNotif);
      }

      options?.onToast?.("Comment posted successfully.");
    },
    [options, portfolios, selectedPortfolio]
  );

  // Delete comment
  const handleDeleteComment = useCallback(
    (portfolioId: string, commentId: string) => {
      setPortfolios((prev) =>
        prev.map((p) => {
          if (p.id === portfolioId) {
            const updatedComments = p.comments.filter((c) => c.id !== commentId);
            return {
              ...p,
              comments: updatedComments,
              commentsCount: Math.max(0, p.commentsCount - 1),
            };
          }
          return p;
        })
      );

      if (selectedPortfolio && selectedPortfolio.id === portfolioId) {
        setSelectedPortfolio((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.filter((c) => c.id !== commentId),
                commentsCount: Math.max(0, prev.commentsCount - 1),
              }
            : null
        );
      }

      options?.onToast?.("Comment deleted.");
    },
    [options, selectedPortfolio]
  );

  // Submit new portfolio
  const handleSubmitPortfolio = useCallback(
    (newPortfolio: Portfolio) => {
      setPortfolios((prev) => [newPortfolio, ...prev]);

      const myUname = options?.currentUser?.username || options?.currentUsername;
      if (myUname && newPortfolio.author.username === myUname) {
        options?.onAutoPin?.(newPortfolio);
      }

      trackEvent("portfolio_submit", {
        portfolioId: newPortfolio.id,
        title: newPortfolio.title,
        category: newPortfolio.category,
      });

      options?.onToast?.(`Portfolio '${newPortfolio.title}' submitted and indexed!`);
    },
    [options]
  );

  // Delete portfolio
  const handleDeletePortfolio = useCallback(
    (portfolioId: string) => {
      setPortfolios((prev) => prev.filter((p) => p.id !== portfolioId));
      if (selectedPortfolio && selectedPortfolio.id === portfolioId) {
        setSelectedPortfolio(null);
      }
      options?.onUnpin?.(portfolioId);

      trackEvent("portfolio_delete", { portfolioId });
      options?.onToast?.("Portfolio removed from registry.");
    },
    [options, selectedPortfolio]
  );

  // Run showcase algorithm simulation
  const handleRunShowcaseCron = useCallback(
    (type: "daily" | "weekly" = "daily") => {
      if (portfolios.length === 0) {
        options?.onToast?.("No candidate portfolios available for showcase selection.");
        return;
      }

      const result = selectShowcaseCandidate(
        portfolios,
        type,
        DEFAULT_SHOWCASE_WEIGHTS,
        showcaseHistoryIds
      );
      if (!result) return;

      const { winner, reason } = result;

      setPortfolios((prev) =>
        prev.map((p) => {
          if (p.id === winner.id) {
            const updated: Portfolio = {
              ...p,
              isShowcase: true,
              showcaseType: type,
              showcaseReason: reason,
            };
            if (selectedPortfolio && selectedPortfolio.id === winner.id) {
              setSelectedPortfolio(updated);
            }
            return updated;
          }
          if (p.showcaseType === type && p.id !== winner.id) {
            return {
              ...p,
              showcaseType: null,
              isShowcase: p.showcaseType === (type === "daily" ? "weekly" : "daily"),
            };
          }
          return p;
        })
      );

      setShowcaseHistoryIds((prev) => [winner.id, ...prev]);

      const showcaseNotif: NotificationItem = {
        id: "cron-" + Date.now(),
        type: "showcase",
        actorName: "RateFactor Cron Engine",
        actorAvatar:
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80",
        portfolioId: winner.id,
        portfolioTitle: winner.title,
        message: `Your project was elected as ${
          type === "daily" ? "today's Daily Showcase" : "this week's Weekly Showcase"
        } winner! (${reason})`,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      options?.onNotify?.(showcaseNotif);

      trackEvent("showcase_cron_triggered", {
        type,
        winnerId: winner.id,
        score: result.scores[0]?.totalScore,
      });

      options?.onToast?.(
        `⚡ Showcase Cron: Elected '${winner.title}' as ${
          type === "daily" ? "Daily Showcase" : "Weekly Showcase"
        }!`
      );
    },
    [options, portfolios, selectedPortfolio, showcaseHistoryIds]
  );

  // Select portfolio by ID
  const handleSelectPortfolioById = useCallback(
    (id: string) => {
      const found = portfolios.find((p) => p.id === id);
      if (found) {
        setSelectedPortfolio(found);
      } else {
        options?.onToast?.("Selected portfolio not found in current registry.");
      }
    },
    [options, portfolios]
  );

  return {
    portfolios,
    setPortfolios,
    selectedPortfolio,
    setSelectedPortfolio,
    isSubmitModalOpen,
    setIsSubmitModalOpen,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    activeSort,
    setActiveSort,
    dailyShowcase,
    weeklyShowcase,
    myPortfolios,
    handleLikeToggle,
    handleRatePortfolio,
    handleAddComment,
    handleDeleteComment,
    handleSubmitPortfolio,
    handleDeletePortfolio,
    handleRunShowcaseCron,
    handleSelectPortfolioById,
  };
}
