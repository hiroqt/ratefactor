"use client";

import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ShowcaseBanner } from "@/components/ShowcaseBanner";
import { PortfolioDetailModal } from "@/components/PortfolioDetailModal";
import { SubmitPortfolioModal } from "@/components/SubmitPortfolioModal";
import { DeveloperDashboardModal } from "@/components/DeveloperDashboardModal";
import { Footer } from "@/components/Footer";
import { INITIAL_PORTFOLIOS } from "@/data/mockPortfolios";
import { INITIAL_NOTIFICATIONS } from "@/data/mockNotifications";
import { 
  Portfolio, 
  PortfolioCategory, 
  SortOption, 
  NotificationItem, 
  RatingBreakdown,
  CommentItem 
} from "@/types/portfolio";
import { 
  selectShowcaseCandidate, 
  DEFAULT_SHOWCASE_WEIGHTS 
} from "@/lib/showcaseAlgorithm";
import { trackEvent } from "@/lib/analytics";
import { Terminal, ArrowLeft } from "lucide-react";
import { DeveloperProfile } from "@/types/profile";
import { INITIAL_DEVELOPER_PROFILE } from "@/data/mockProfile";
import { DeveloperDashboard } from "@/components/dashboard/DeveloperDashboard";

export default function Home() {
  // State
  const [portfolios, setPortfolios] = useState<Portfolio[]>(INITIAL_PORTFOLIOS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [showcaseHistoryIds, setShowcaseHistoryIds] = useState<string[]>(["hyperion-lsm", "kubelens-tui"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<PortfolioCategory>("All");
  const [activeSort, setActiveSort] = useState<SortOption>("highest_rated");
  const [activeNavTab, setActiveNavTab] = useState("discover");

  // Developer Profile State (GitHub-style bio, status, showcase pins)
  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile>(INITIAL_DEVELOPER_PROFILE);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("ratefactor_dev_profile");
      if (saved) {
        setDeveloperProfile(JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleUpdateProfile = (updated: DeveloperProfile) => {
    setDeveloperProfile(updated);
    try {
      localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  // Modals
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  // Success message toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

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

  // User's own portfolios (Arnel Rivera / @arneldev or updated profile username)
  const myPortfolios = useMemo(() => {
    return portfolios.filter(
      (p) =>
        p.author.username === developerProfile.username ||
        p.author.username === "arneldev"
    );
  }, [portfolios, developerProfile.username]);

  // Unread notification count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Navigation tab handler
  const handleNavTabChange = (tab: string) => {
    setActiveNavTab(tab);
    if (tab === "showcase") {
      setActiveSort("showcase");
    } else if (tab === "discover" && activeSort === "showcase") {
      setActiveSort("highest_rated");
    }
  };

  // Action: Toggle Like (with optimistic sync to selectedPortfolio & PRD notification)
  const handleLikeToggle = (portfolioId: string, isLiked: boolean) => {
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

    // Notification on like (PRD Sections 4.4, 5)
    if (isLiked) {
      const target = portfolios.find((p) => p.id === portfolioId);
      if (target) {
        const isTargetAuthorMe = target.author.username === "arneldev";
        const newNotif: NotificationItem = {
          id: "notif-like-" + Date.now(),
          type: "like",
          actorName: isTargetAuthorMe ? "Elena Rostova" : "Arnel Rivera",
          actorAvatar: isTargetAuthorMe
            ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
            : "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
          portfolioId: target.id,
          portfolioTitle: target.title,
          message: isTargetAuthorMe ? "liked your portfolio." : `appreciated ${target.title}.`,
          timestamp: new Date().toISOString(),
          isRead: false,
        };
        setNotifications((prev) => [newNotif, ...prev]);
      }
    }
  };

  // Action: Rate Portfolio (Mathematically sound aggregate breakdown updates and user tracking)
  const handleRatePortfolio = (
    portfolioId: string,
    ratingScore: number,
    breakdown: RatingBreakdown
  ) => {
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

          // Calculate updated aggregate breakdown across criteria without overwriting community scores
          const prevUserBreakdown = p.userRatingBreakdown || {
            codeQuality: prevScore,
            performance: prevScore,
            design: prevScore,
            documentation: prevScore,
          };

          const calcNewCriterion = (
            currentAggregate: number,
            newCriterionValue: number,
            prevUserCriterionValue: number
          ) => {
            const currentTotal = currentAggregate * p.ratingCount;
            const updatedTotal = hasUserRated
              ? currentTotal - prevUserCriterionValue + newCriterionValue
              : currentTotal + newCriterionValue;
            return Number((Math.min(5, Math.max(1, updatedTotal / Math.max(1, newCount)))).toFixed(2));
          };

          const currentBreakdown = p.ratingBreakdown || {
            codeQuality: p.rating,
            performance: p.rating,
            design: p.rating,
            documentation: p.rating,
          };

          const updatedAggregateBreakdown: RatingBreakdown = {
            codeQuality: calcNewCriterion(currentBreakdown.codeQuality, breakdown.codeQuality, prevUserBreakdown.codeQuality),
            performance: calcNewCriterion(currentBreakdown.performance, breakdown.performance, prevUserBreakdown.performance),
            design: calcNewCriterion(currentBreakdown.design, breakdown.design, prevUserBreakdown.design),
            documentation: calcNewCriterion(currentBreakdown.documentation, breakdown.documentation, prevUserBreakdown.documentation),
          };

          const updated: Portfolio = {
            ...p,
            rating: boundedAvg,
            ratingCount: newCount,
            userRating: ratingScore,
            userRatingBreakdown: breakdown,
            ratingBreakdown: updatedAggregateBreakdown,
          };

          if (selectedPortfolio && selectedPortfolio.id === portfolioId) {
            setSelectedPortfolio(updated);
          }

          return updated;
        }
        return p;
      })
    );

    showToast(`Your rating (${ratingScore.toFixed(1)}★) has been logged.`);

    // Push notification to author (PRD Section 5)
    const target = portfolios.find((p) => p.id === portfolioId);
    if (target) {
      const isTargetAuthorMe = target.author.username === "arneldev";
      const newNotif: NotificationItem = {
        id: "notif-rate-" + Date.now(),
        type: "rating",
        actorName: isTargetAuthorMe ? "Elena Rostova" : "Arnel Rivera",
        actorAvatar: isTargetAuthorMe
          ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
          : "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
        portfolioId: target.id,
        portfolioTitle: target.title,
        message: isTargetAuthorMe
          ? `evaluated your portfolio with ${ratingScore.toFixed(1)}★ peer score.`
          : `submitted a ${ratingScore.toFixed(1)}★ peer critique for ${target.title}.`,
        ratingScore,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  // Action: Add Comment (PRD Section 4.5 & 5)
  const handleAddComment = (portfolioId: string, content: string) => {
    const newComment: CommentItem = {
      id: "comment-" + Date.now(),
      authorName: "Arnel Rivera",
      authorUsername: "arneldev",
      authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
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

    // Update current selected modal if open
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

    // Dispatch comment notification to author (PRD Section 4.5 & 5)
    const target = portfolios.find((p) => p.id === portfolioId);
    if (target) {
      const isTargetAuthorMe = target.author.username === "arneldev";
      const newNotif: NotificationItem = {
        id: "notif-comment-" + Date.now(),
        type: "comment",
        actorName: isTargetAuthorMe ? "Marcus Chen" : "Arnel Rivera",
        actorAvatar: isTargetAuthorMe
          ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
          : "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
        portfolioId: target.id,
        portfolioTitle: target.title,
        message: isTargetAuthorMe
          ? `commented on your project: "${content.slice(0, 45)}${content.length > 45 ? "..." : ""}"`
          : `commented on ${target.title}: "${content.slice(0, 45)}${content.length > 45 ? "..." : ""}"`,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }

    showToast("Comment posted successfully.");
  };

  // Action: Delete Comment
  const handleDeleteComment = (portfolioId: string, commentId: string) => {
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

    showToast("Comment deleted.");
  };

  // Action: Submit New Portfolio
  const handleSubmitPortfolio = (newPortfolio: Portfolio) => {
    setPortfolios((prev) => [newPortfolio, ...prev]);

    // If submitted by user, auto-pin to showcase if space available
    if (newPortfolio.author.username === developerProfile.username || newPortfolio.author.username === "arneldev") {
      setDeveloperProfile((prev) => {
        if (prev.pinnedPortfolioIds.length < 6 && !prev.pinnedPortfolioIds.includes(newPortfolio.id)) {
          const updated: DeveloperProfile = {
            ...prev,
            pinnedPortfolioIds: [newPortfolio.id, ...prev.pinnedPortfolioIds],
            spotlightPortfolioId: prev.spotlightPortfolioId || newPortfolio.id,
          };
          try {
            localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
          } catch (e) {}
          return updated;
        }
        return prev;
      });
    }

    trackEvent("portfolio_submit", {
      portfolioId: newPortfolio.id,
      title: newPortfolio.title,
      category: newPortfolio.category,
    });
    showToast(`Portfolio '${newPortfolio.title}' submitted and indexed!`);
  };

  // Action: Delete Portfolio
  const handleDeletePortfolio = (portfolioId: string) => {
    setPortfolios((prev) => prev.filter((p) => p.id !== portfolioId));
    if (selectedPortfolio && selectedPortfolio.id === portfolioId) {
      setSelectedPortfolio(null);
    }

    // Clean up from pinned showcase if deleted
    setDeveloperProfile((prev) => {
      if (prev.pinnedPortfolioIds.includes(portfolioId)) {
        const nextPinned = prev.pinnedPortfolioIds.filter((id) => id !== portfolioId);
        const updated: DeveloperProfile = {
          ...prev,
          pinnedPortfolioIds: nextPinned,
          spotlightPortfolioId:
            prev.spotlightPortfolioId === portfolioId
              ? nextPinned[0] || undefined
              : prev.spotlightPortfolioId,
        };
        try {
          localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
        } catch (e) {}
        return updated;
      }
      return prev;
    });

    trackEvent("portfolio_delete", { portfolioId });
    showToast("Portfolio removed from registry.");
  };

  // Action: Trigger Automated Weighted Showcase Selection (Vercel Cron simulation per PRD Section 6)
  const handleRunShowcaseCron = (type: "daily" | "weekly" = "daily") => {
    if (portfolios.length === 0) {
      showToast("No candidate portfolios available for showcase selection.");
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

    // Dispatch real-time notification to winner (PRD Section 5 & 6)
    const showcaseNotif: NotificationItem = {
      id: "cron-" + Date.now(),
      type: "showcase",
      actorName: "RateFactor Cron Engine",
      actorAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80",
      portfolioId: winner.id,
      portfolioTitle: winner.title,
      message: `Your project was elected as ${type === "daily" ? "today's Daily Showcase" : "this week's Weekly Showcase"} winner! (${reason})`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setNotifications((prev) => [showcaseNotif, ...prev]);

    trackEvent("showcase_cron_triggered", {
      type,
      winnerId: winner.id,
      score: result.scores[0]?.totalScore,
    });

    showToast(`⚡ Showcase Cron: Elected '${winner.title}' as ${type === "daily" ? "Daily Showcase" : "Weekly Showcase"}!`);
  };

  // Action: Notification handlers
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  // Simulate Realtime Event (Supabase Realtime demo)
  const handleSimulateIncoming = () => {
    const actors = [
      {
        name: "Devon Vance",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Elena Rostova",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Marcus Chen",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      },
    ];

    const randomActor = actors[Math.floor(Math.random() * actors.length)];
    const randomPortfolio = portfolios[Math.floor(Math.random() * portfolios.length)];

    if (!randomPortfolio) return;

    const newNotif: NotificationItem = {
      id: "sim-" + Date.now(),
      type: "rating",
      actorName: randomActor.name,
      actorAvatar: randomActor.avatar,
      portfolioId: randomPortfolio.id,
      portfolioTitle: randomPortfolio.title,
      message: `evaluated ${randomPortfolio.title} with 5.0★ architecture rating.`,
      ratingScore: 5.0,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    setNotifications((prev) => [newNotif, ...prev]);
    showToast(`⚡ Realtime Event: ${randomActor.name} rated ${randomPortfolio.title}`);
  };

  // Select portfolio by ID from notification or search
  const handleSelectPortfolioById = (id: string) => {
    const found = portfolios.find((p) => p.id === id);
    if (found) {
      setSelectedPortfolio(found);
      setIsNotificationOpen(false);
    } else {
      showToast("Selected portfolio not found in current registry.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Toast message alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-3.5 py-2 rounded-lg bg-slate-900 text-white border border-slate-800 shadow-lg text-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-2 duration-150">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        unreadCount={unreadCount}
        isNotificationOpen={isNotificationOpen}
        setIsNotificationOpen={setIsNotificationOpen}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllAsRead}
        onMarkAsRead={handleMarkAsRead}
        onSimulateIncoming={handleSimulateIncoming}
        onSelectPortfolioById={handleSelectPortfolioById}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        activeNavTab={activeNavTab}
        setActiveNavTab={handleNavTabChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectCategory={(cat) => {
          setActiveCategory(cat);
          setActiveNavTab("discover");
          const el = document.getElementById("showcase-bento");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
        onSelectSort={setActiveSort}
        profile={developerProfile}
      />

      <main className="flex-1">
        {/* Dedicated Full Developer Dashboard View */}
        {activeNavTab === "dashboard" ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
            <div className="mb-4">
              <button
                type="button"
                onClick={() => handleNavTabChange("discover")}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Architecture Discovery Feed</span>
              </button>
            </div>

            <div className="bg-slate-50 rounded-3xl border border-slate-200 p-4 sm:p-8 shadow-xs">
              <DeveloperDashboard
                profile={developerProfile}
                onUpdateProfile={handleUpdateProfile}
                myPortfolios={myPortfolios}
                onSelectPortfolio={(p) => setSelectedPortfolio(p)}
                onDeletePortfolio={handleDeletePortfolio}
                onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Hero Section (Only in discover mode) */}
            {activeNavTab === "discover" && (
              <HeroSection
                showcasePortfolio={dailyShowcase}
                onInspectShowcase={(p) => setSelectedPortfolio(p)}
                onSubmitClick={() => setIsSubmitModalOpen(true)}
                onExploreClick={() => {
                  const el = document.getElementById("showcase-bento");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                profile={developerProfile}
              />
            )}

            {/* Bento Showcase Grid: Daily Spotlight, Leaderboard, Fresh from Developers */}
            <ShowcaseBanner
              portfolios={portfolios}
              dailyShowcase={dailyShowcase}
              weeklyShowcase={weeklyShowcase}
              onSelectPortfolio={(p) => setSelectedPortfolio(p)}
              onLikeToggle={handleLikeToggle}
              onTriggerAlgorithm={handleRunShowcaseCron}
              onCategorySelect={(cat) => {
                setActiveCategory(cat);
                const el = document.getElementById("showcase-bento");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              isCompact={activeNavTab === "discover"}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals & Drawers */}
      <PortfolioDetailModal
        portfolio={selectedPortfolio}
        onClose={() => setSelectedPortfolio(null)}
        onLikeToggle={handleLikeToggle}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onRatePortfolio={handleRatePortfolio}
      />

      <SubmitPortfolioModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleSubmitPortfolio}
        existingPortfolios={portfolios}
        profile={developerProfile}
      />

      <DeveloperDashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        profile={developerProfile}
        onUpdateProfile={handleUpdateProfile}
        myPortfolios={myPortfolios}
        onSelectPortfolio={(p) => setSelectedPortfolio(p)}
        onDeletePortfolio={handleDeletePortfolio}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
      />
    </div>
  );
}
