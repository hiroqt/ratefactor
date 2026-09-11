"use client";

import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ShowcaseBanner } from "@/components/ShowcaseBanner";
import { FilterBar } from "@/components/FilterBar";
import { PortfolioCard } from "@/components/PortfolioCard";
import { PortfolioDetailModal } from "@/components/PortfolioDetailModal";
import { SubmitPortfolioModal } from "@/components/SubmitPortfolioModal";
import { NotificationDrawer } from "@/components/NotificationDrawer";
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
import { Flame, Star, Sparkles, Terminal } from "lucide-react";

export default function Home() {
  // State
  const [portfolios, setPortfolios] = useState<Portfolio[]>(INITIAL_PORTFOLIOS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<PortfolioCategory>("All");
  const [activeSort, setActiveSort] = useState<SortOption>("highest_rated");
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeNavTab, setActiveNavTab] = useState("discover");

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

  // Collect unique technologies for filter chips
  const availableTechs = useMemo(() => {
    const techSet = new Set<string>();
    portfolios.forEach((p) => {
      p.techStack.forEach((t) => techSet.add(t));
    });
    return Array.from(techSet).slice(0, 8);
  }, [portfolios]);

  // Daily & Weekly showcases
  const dailyShowcase = useMemo(() => {
    return portfolios.find((p) => p.showcaseType === "daily") || portfolios[0];
  }, [portfolios]);

  const weeklyShowcase = useMemo(() => {
    return (
      portfolios.find((p) => p.showcaseType === "weekly") ||
      portfolios[1] ||
      portfolios[0]
    );
  }, [portfolios]);

  // User's own portfolios (Arnel Rivera / @arneldev)
  const myPortfolios = useMemo(() => {
    return portfolios.filter((p) => p.author.username === "arneldev");
  }, [portfolios]);

  // Unread notification count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Filtered & Sorted Portfolios
  const filteredPortfolios = useMemo(() => {
    return portfolios
      .filter((p) => {
        // Category filter
        if (activeCategory !== "All" && p.category !== activeCategory) {
          return false;
        }

        // Tech filter
        if (selectedTech && !p.techStack.includes(selectedTech)) {
          return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(query);
          const matchTagline = p.tagline.toLowerCase().includes(query);
          const matchAuthor = p.author.name.toLowerCase().includes(query);
          const matchTech = p.techStack.some((t) => t.toLowerCase().includes(query));
          if (!matchTitle && !matchTagline && !matchAuthor && !matchTech) {
            return false;
          }
        }

        // Showcase only filter
        if (activeSort === "showcase" && !p.isShowcase) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (activeSort) {
          case "highest_rated":
            return b.rating - a.rating;
          case "most_liked":
            return b.likesCount - a.likesCount;
          case "most_discussed":
            return b.commentsCount - a.commentsCount;
          case "latest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "showcase":
            return (b.isShowcase ? 1 : 0) - (a.isShowcase ? 1 : 0);
          default:
            return 0;
        }
      });
  }, [portfolios, activeCategory, selectedTech, searchQuery, activeSort]);

  // Action: Toggle Like
  const handleLikeToggle = (portfolioId: string, isLiked: boolean) => {
    setPortfolios((prev) =>
      prev.map((p) => {
        if (p.id === portfolioId) {
          const nextCount = isLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1);
          return {
            ...p,
            isLiked,
            likesCount: nextCount,
          };
        }
        return p;
      })
    );

    // If we liked someone else's portfolio, simulate a notification
    if (isLiked) {
      const target = portfolios.find((p) => p.id === portfolioId);
      if (target && target.author.username === "arneldev") {
        const newNotif: NotificationItem = {
          id: "notif-" + Date.now(),
          type: "like",
          actorName: "Elena Rostova",
          actorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
          portfolioId: target.id,
          portfolioTitle: target.title,
          message: "liked your portfolio.",
          timestamp: new Date().toISOString(),
          isRead: false,
        };
        setNotifications((prev) => [newNotif, ...prev]);
      }
    }
  };

  // Action: Rate Portfolio
  const handleRatePortfolio = (
    portfolioId: string,
    ratingScore: number,
    breakdown: RatingBreakdown
  ) => {
    setPortfolios((prev) =>
      prev.map((p) => {
        if (p.id === portfolioId) {
          const newCount = p.ratingCount + (p.userRating ? 0 : 1);
          const newAvg = Number(
            ((p.rating * p.ratingCount + ratingScore) / (p.ratingCount + 1)).toFixed(2)
          );
          return {
            ...p,
            rating: newAvg,
            ratingCount: newCount,
            userRating: ratingScore,
            ratingBreakdown: breakdown,
          };
        }
        return p;
      })
    );

    showToast(`Your rating (${ratingScore.toFixed(1)}★) has been logged.`);

    // Push notification to author
    const target = portfolios.find((p) => p.id === portfolioId);
    if (target) {
      const newNotif: NotificationItem = {
        id: "notif-" + Date.now(),
        type: "rating",
        actorName: "Arnel Rivera",
        actorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
        portfolioId: target.id,
        portfolioTitle: target.title,
        message: `submitted a ${ratingScore.toFixed(1)}★ peer critique.`,
        ratingScore,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    }
  };

  // Action: Add Comment
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
    showToast(`Portfolio '${newPortfolio.title}' submitted and indexed!`);
  };

  // Action: Delete Portfolio
  const handleDeletePortfolio = (portfolioId: string) => {
    setPortfolios((prev) => prev.filter((p) => p.id !== portfolioId));
    showToast("Portfolio removed from registry.");
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
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Toast message alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg bg-surface border border-brand-500/50 shadow-elevated text-xs text-foreground flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-brand-400 live-beacon" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        unreadCount={unreadCount}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        activeNavTab={activeNavTab}
        setActiveNavTab={setActiveNavTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <main className="flex-1">
        {/* Hero Section */}
        {activeNavTab === "discover" && (
          <HeroSection
            showcasePortfolio={dailyShowcase}
            onInspectShowcase={(p) => setSelectedPortfolio(p)}
            onSubmitClick={() => setIsSubmitModalOpen(true)}
            onExploreClick={() => {
              const el = document.getElementById("discovery-grid");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        )}

        {/* Showcase Banner (Daily & Weekly) */}
        {(activeNavTab === "discover" || activeNavTab === "showcase") && (
          <ShowcaseBanner
            dailyShowcase={dailyShowcase}
            weeklyShowcase={weeklyShowcase}
            onSelectPortfolio={(p) => setSelectedPortfolio(p)}
          />
        )}

        {/* Discovery Feed Section */}
        <section id="discovery-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter Bar */}
          <FilterBar
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            activeSort={activeSort}
            onSortChange={setActiveSort}
            selectedTech={selectedTech}
            onTechSelect={setSelectedTech}
            availableTechs={availableTechs}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            totalCount={filteredPortfolios.length}
          />

          {/* Portfolios Grid / List View */}
          {filteredPortfolios.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-xl bg-surface/50 my-6">
              <Terminal className="w-8 h-8 text-muted mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground">No portfolios found</h3>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                No developer portfolios match your current search query or technology filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("All");
                  setSelectedTech(null);
                  setActiveSort("highest_rated");
                }}
                className="mt-4 px-3 py-1.5 rounded-md bg-surface-raised border border-border text-xs text-brand-400 hover:text-brand-300"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-6"
                  : "flex flex-col gap-3 my-6"
              }
            >
              {filteredPortfolios.map((portfolio) => (
                <PortfolioCard
                  key={portfolio.id}
                  portfolio={portfolio}
                  onSelect={(p) => setSelectedPortfolio(p)}
                  onLikeToggle={handleLikeToggle}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </section>
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
      />

      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllAsRead}
        onMarkAsRead={handleMarkAsRead}
        onSimulateIncoming={handleSimulateIncoming}
        onSelectPortfolioById={handleSelectPortfolioById}
      />

      <DeveloperDashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        myPortfolios={myPortfolios}
        onSelectPortfolio={(p) => setSelectedPortfolio(p)}
        onDeletePortfolio={handleDeletePortfolio}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
      />
    </div>
  );
}
