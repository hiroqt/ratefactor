"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Portfolio,
  PortfolioCategory,
  SortOption,
  RatingBreakdown,
  CommentItem,
  NotificationItem,
  CritiqueTag,
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

// Shared in-memory singleton cache across Next.js client route transitions
let memoryPortfoliosCache: Portfolio[] | null = null;

export function usePortfolios(options?: UsePortfoliosOptions) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(() => {
    if (memoryPortfoliosCache && memoryPortfoliosCache.length > 0) {
      return memoryPortfoliosCache;
    }
    return INITIAL_PORTFOLIOS;
  });

  // Hydration-safe initial load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ratefactor_portfolios");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Clean legacy placeholder items if any
          const validSaved = parsed.filter(
            (p: any) =>
              p &&
              p.id &&
              p.id !== "hyperion-lsm" &&
              p.id !== "kubelens-tui" &&
              p.id !== "zenith-state"
          );

          // Merge with INITIAL_PORTFOLIOS so catalog updates are included while user changes are preserved
          const map = new Map<string, Portfolio>();
          INITIAL_PORTFOLIOS.forEach((p) => map.set(p.id, p));
          validSaved.forEach((p: Portfolio) => {
            if (p && p.id) {
              map.set(p.id, p);
            }
          });
          const merged = Array.from(map.values());
          memoryPortfoliosCache = merged;
          setPortfolios(merged);
        }
      }
    } catch (e) {}
  }, []);

  // Synchronize memory cache whenever state changes
  useEffect(() => {
    if (portfolios && portfolios.length > 0) {
      memoryPortfoliosCache = portfolios;
    }
  }, [portfolios]);

  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<PortfolioCategory>("All");
  const [activeSort, setActiveSort] = useState<SortOption>("highest_rated");
  const [showcaseHistoryIds, setShowcaseHistoryIds] = useState<string[]>([]);

  // Cooldown tracker per portfolio to prevent spam clicking / rapid toggles
  const lastActionTimestamps = useRef<Map<string, number>>(new Map());

  // Listen for cross-tab portfolio updates via localStorage
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "ratefactor_portfolios" && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) {
            setPortfolios(updated);
          }
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

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

  // User's own portfolios (real-time recalculation based on author match)
  const myPortfolios = useMemo(() => {
    const username = (options?.currentUsername || options?.currentUser?.username || "").toLowerCase().trim();
    const name = (options?.currentUser?.name || "").toLowerCase().trim();
    if (!username && !name) return [];

    return portfolios.filter((p) => {
      const pUser = (p.author?.username || "").toLowerCase().trim();
      const pName = (p.author?.name || "").toLowerCase().trim();
      return (username && pUser === username) || (name && pName === name);
    });
  }, [portfolios, options?.currentUsername, options?.currentUser]);

  // Multi-attribute search & filter: Primary Domain, Username, Portfolio Title, Tech Stack
  const filteredPortfolios = useMemo(() => {
    let result = [...portfolios];

    // 1. Category Filter
    if (activeCategory !== "All") {
      result = result.filter((p) => p.category === activeCategory);
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        // Extract domain hostname if portfolioUrl exists
        let domain = "";
        try {
          if (p.portfolioUrl) {
            const urlObj = new URL(
              p.portfolioUrl.startsWith("http") ? p.portfolioUrl : `https://${p.portfolioUrl}`
            );
            domain = urlObj.hostname.toLowerCase();
          }
        } catch {}

        let demoDomain = "";
        try {
          if (p.demoUrl) {
            const urlObj = new URL(
              p.demoUrl.startsWith("http") ? p.demoUrl : `https://${p.demoUrl}`
            );
            demoDomain = urlObj.hostname.toLowerCase();
          }
        } catch {}

        const matchesTitle = p.title?.toLowerCase().includes(q) || false;
        const matchesTagline = p.tagline?.toLowerCase().includes(q) || false;
        const matchesDescription = p.description?.toLowerCase().includes(q) || false;
        const matchesUsername = p.author?.username?.toLowerCase().includes(q) || false;
        const matchesAuthorName = p.author?.name?.toLowerCase().includes(q) || false;
        const matchesCategory = p.category?.toLowerCase().includes(q) || false;
        const matchesDomain =
          (domain && domain.includes(q)) ||
          (demoDomain && demoDomain.includes(q)) ||
          p.portfolioUrl?.toLowerCase().includes(q) ||
          p.demoUrl?.toLowerCase().includes(q) ||
          false;
        const matchesTech = p.techStack?.some((t) => t.toLowerCase().includes(q)) || false;

        return (
          matchesTitle ||
          matchesTagline ||
          matchesDescription ||
          matchesUsername ||
          matchesAuthorName ||
          matchesCategory ||
          matchesDomain ||
          matchesTech
        );
      });
    }

    // 3. Sorting
    if (activeSort === "highest_rated") {
      result.sort((a, b) => b.rating - a.rating || (b.likesCount || 0) - (a.likesCount || 0));
    } else if (activeSort === "most_liked") {
      result.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0) || b.rating - a.rating);
    } else if (activeSort === "most_discussed") {
      result.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    } else if (activeSort === "latest") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (activeSort === "showcase") {
      result.sort((a, b) => (b.isShowcase ? 1 : 0) - (a.isShowcase ? 1 : 0));
    }

    return result;
  }, [portfolios, activeCategory, searchQuery, activeSort]);

  // Like toggle with anti-abuse rate limit / cooldown
  const handleLikeToggle = useCallback(
    (portfolioId: string, isLiked?: boolean) => {
      if (!options?.currentUser) {
        options?.onRequireAuth?.("Sign in with GitHub or Email to heart and like portfolios.");
        return;
      }

      // Rate limit check: Min 1.2s cooldown between toggles on the same portfolio
      const now = Date.now();
      const lastAction = lastActionTimestamps.current.get(portfolioId) || 0;
      if (now - lastAction < 1200) {
        const remaining = Math.ceil((1200 - (now - lastAction)) / 1000);
        options?.onToast?.(`Action cooldown: Please wait ${remaining}s before liking/unliking again.`);
        return;
      }
      lastActionTimestamps.current.set(portfolioId, now);

      setPortfolios((prev) =>
        prev.map((p) => {
          if (p.id === portfolioId) {
            const nextLiked = isLiked !== undefined ? isLiked : !p.isLiked;
            const currentReactions = { ...(p.reactions || {}) };
            const defaultEmoji = p.userReaction || "star-struck";

            if (nextLiked) {
              currentReactions[defaultEmoji] = (currentReactions[defaultEmoji] || 0) + 1;
            } else if (p.userReaction && currentReactions[p.userReaction]) {
              currentReactions[p.userReaction] = Math.max(0, currentReactions[p.userReaction] - 1);
              if (currentReactions[p.userReaction] === 0) {
                delete currentReactions[p.userReaction];
              }
            }

            const totalReactionsCount = Object.values(currentReactions).reduce((a, b) => a + b, 0);
            const nextCount = nextLiked
              ? Math.max(p.likesCount + 1, totalReactionsCount)
              : Math.max(0, p.likesCount - 1);

            const updated: Portfolio = {
              ...p,
              isLiked: nextLiked,
              userReaction: nextLiked ? defaultEmoji : undefined,
              reactions: currentReactions,
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

      // Trigger asynchronous API call to server
      fetch(`/api/portfolios/${portfolioId}/like`, { method: "POST" })
        .then((res) => {
          if (res.status === 429) {
            options?.onToast?.("Rate limit reached. Please slow down like actions.");
          }
        })
        .catch(() => {});
    },
    [options, selectedPortfolio]
  );

  // Emoji reaction with rate limit & toggling
  const handleReact = useCallback(
    (portfolioId: string, emojiName: string) => {
      if (!options?.currentUser) {
        options?.onRequireAuth?.("Sign in with GitHub or Email to react to developer portfolios.");
        return;
      }

      // Rate limit check: Min 1.2s cooldown
      const now = Date.now();
      const lastAction = lastActionTimestamps.current.get(portfolioId) || 0;
      if (now - lastAction < 1200) {
        const remaining = Math.ceil((1200 - (now - lastAction)) / 1000);
        options?.onToast?.(`Action cooldown: Please wait ${remaining}s before reacting again.`);
        return;
      }
      lastActionTimestamps.current.set(portfolioId, now);

      setPortfolios((prev) =>
        prev.map((p) => {
          if (p.id === portfolioId) {
            const currentReactions = { ...(p.reactions || {}) };
            const prevUserEmoji = p.userReaction;
            let nextUserEmoji: string | undefined = emojiName;
            let nextLiked = true;

            if (prevUserEmoji === emojiName) {
              // Clicking the same emoji toggles it off
              currentReactions[emojiName] = Math.max(0, (currentReactions[emojiName] || 1) - 1);
              if (currentReactions[emojiName] === 0) {
                delete currentReactions[emojiName];
              }
              nextUserEmoji = undefined;
              nextLiked = false;
            } else {
              // Switching from previous emoji to new emoji
              if (prevUserEmoji && currentReactions[prevUserEmoji]) {
                currentReactions[prevUserEmoji] = Math.max(0, currentReactions[prevUserEmoji] - 1);
                if (currentReactions[prevUserEmoji] === 0) {
                  delete currentReactions[prevUserEmoji];
                }
              }
              currentReactions[emojiName] = (currentReactions[emojiName] || 0) + 1;
              nextUserEmoji = emojiName;
              nextLiked = true;
            }

            const totalReactionsCount = Object.values(currentReactions).reduce((a, b) => a + b, 0);

            const updated: Portfolio = {
              ...p,
              isLiked: nextLiked,
              userReaction: nextUserEmoji,
              reactions: currentReactions,
              likesCount: Math.max(0, totalReactionsCount),
            };

            if (selectedPortfolio && selectedPortfolio.id === portfolioId) {
              setSelectedPortfolio(updated);
            }
            return updated;
          }
          return p;
        })
      );

      // Async API like sync
      fetch(`/api/portfolios/${portfolioId}/like`, { method: "POST" }).catch(() => {});

      trackEvent("portfolio_reaction", { portfolioId, reaction: emojiName });
    },
    [options, selectedPortfolio]
  );

  // Rate portfolio
  const handleRatePortfolio = useCallback(
    (portfolioId: string, ratingScore: number, breakdown: RatingBreakdown) => {
      if (!options?.currentUser) {
        options?.onRequireAuth?.("Sign in with GitHub or Email to rate developer portfolios.");
        return;
      }

      // Calculate composite arithmetic mean across all 4 dimensions
      const compositeScore = Number(
        ((breakdown.design + breakdown.codeQuality + breakdown.performance + breakdown.documentation) / 4).toFixed(2)
      );

      setPortfolios((prev) =>
        prev.map((p) => {
          if (p.id === portfolioId) {
            const hasUserRated = Boolean(p.userRating);
            const newCount = hasUserRated ? p.ratingCount : p.ratingCount + 1;
            const oldPoints = p.rating * p.ratingCount;
            const prevScore = p.userRating || 0;
            const newPoints = hasUserRated
              ? oldPoints - prevScore + compositeScore
              : oldPoints + compositeScore;
            const newAvg = Number((newPoints / Math.max(1, newCount)).toFixed(2));
            const boundedAvg = Math.min(5, Math.max(1, newAvg));

            const prevUserBreakdown = p.userRatingBreakdown || {
              codeQuality: prevScore,
              performance: prevScore,
              design: prevScore,
              documentation: prevScore,
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
              documentation: calcNewCriterion(
                p.ratingBreakdown.documentation ?? 5,
                breakdown.documentation ?? 5,
                prevUserBreakdown.documentation ?? 5
              ),
            };

            const updated: Portfolio = {
              ...p,
              rating: boundedAvg,
              ratingCount: newCount,
              userRating: compositeScore,
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

      // Persist rating via API endpoint
      fetch(`/api/portfolios/${portfolioId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId,
          design: breakdown.design,
          codeQuality: breakdown.codeQuality,
          performance: breakdown.performance,
          documentation: breakdown.documentation,
        }),
      }).catch(() => {});

      options?.onToast?.(`Your rating (${compositeScore.toFixed(1)}★) has been logged.`);
    },
    [options, selectedPortfolio]
  );

  // Add Comment
  const handleAddComment = useCallback(
    (portfolioId: string, content: string, critiqueTag?: CritiqueTag | null) => {
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
        critiqueTag: critiqueTag || null,
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

      // Persist structured critique comment via API endpoint
      fetch(`/api/portfolios/${portfolioId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId,
          content,
          critiqueTag: critiqueTag || undefined,
        }),
      }).catch(() => {});

      options?.onToast?.("Comment posted successfully.");
    },
    [options, selectedPortfolio]
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

      // Sync deletion with backend API
      fetch(`/api/portfolios/${portfolioId}/comments/${commentId}`, {
        method: "DELETE",
      }).catch((err) => {
        console.warn("[handleDeleteComment] Backend delete failed:", err);
      });

      options?.onToast?.("Comment deleted.");
    },
    [options, selectedPortfolio]
  );

  // Submit new portfolio
  const handleSubmitPortfolio = useCallback(
    async (newPortfolio: Portfolio) => {
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

      // Persist to backend server API
      try {
        await fetch("/api/portfolios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newPortfolio.title,
            tagline: newPortfolio.tagline,
            description: newPortfolio.description,
            portfolioUrl: newPortfolio.portfolioUrl,
            githubUrl: newPortfolio.githubUrl,
            demoUrl: newPortfolio.demoUrl,
            thumbnailUrl: newPortfolio.thumbnail,
            imageSizeBytes: newPortfolio.imageSizeBytes || 1024 * 500,
            category: newPortfolio.category,
            techStack: newPortfolio.techStack,
            requestCritique: Boolean(newPortfolio.requestCritique),
            authorName: newPortfolio.author.name,
            authorUsername: newPortfolio.author.username,
            authorAvatar: newPortfolio.author.avatar,
          }),
        });
      } catch (err) {
        console.warn("[handleSubmitPortfolio] Failed to persist to backend:", err);
      }
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
    filteredPortfolios,
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
    handleReact,
    handleRatePortfolio,
    handleAddComment,
    handleDeleteComment,
    handleSubmitPortfolio,
    handleDeletePortfolio,
    handleRunShowcaseCron,
    handleSelectPortfolioById,
  };
}
