"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar, Footer } from "@/components/layout";
import {
  HeroSection,
  ShowcaseBanner,
  DiscoverApps,
  PortfolioDetailModal,
  SubmitPortfolioModal,
  usePortfolios,
} from "@/features/portfolios";
import {
  DeveloperDashboard,
  DeveloperDashboardModal,
  useDeveloperProfile,
} from "@/features/dashboard";
import { AuthModal, useAuth } from "@/features/auth";
import { useNotifications } from "@/features/notifications";
import { useToast } from "@/hooks/useToast";
import { Portfolio, PortfolioCategory } from "@/types/portfolio";
import { DeveloperProfile } from "@/types/profile";
import { PublicProfileModal } from "@/components/PublicProfileModal";
import { Terminal, ArrowLeft } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [visitedUser, setVisitedUser] = useState<DeveloperProfile | null>(null);
  const [activeNavTab, setActiveNavTab] = useState("discover");

  // 1. Unified Authentication State
  const {
    currentUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authIntentMessage,
    requireAuth,
    handleAuthSuccess,
    handleSignOut,
  } = useAuth({
    onAuthSuccess: (u) => {
      toast.success(`Authenticated as @${u.username || u.name} (${(u.role || "developer").toUpperCase()})`);
    },
    onSignOut: () => {
      toast.info("Signed out. You are now browsing as a guest.");
    },
  });

  // 2. Developer Profile State
  const {
    developerProfile,
    updateProfile,
    updatePins,
  } = useDeveloperProfile(currentUser);

  // 3. Real-time Notifications State
  const {
    notifications,
    unreadCount,
    isNotificationOpen,
    setIsNotificationOpen,
    markAllAsRead,
    markAsRead,
    addNotification,
  } = useNotifications();

  // 4. Portfolios State & Operations
  const {
    portfolios,
    filteredPortfolios,
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
  } = usePortfolios({
    currentUser,
    currentUsername: developerProfile.username,
    onRequireAuth: requireAuth,
    onNotify: addNotification,
    onToast: (msg) => toast.info(msg),
    onAutoPin: React.useCallback((newPortfolio: Portfolio) => {
      if (
        developerProfile.pinnedPortfolioIds.length < 6 &&
        !developerProfile.pinnedPortfolioIds.includes(newPortfolio.id)
      ) {
        updatePins(
          [newPortfolio.id, ...developerProfile.pinnedPortfolioIds],
          developerProfile.spotlightPortfolioId || newPortfolio.id
        );
      }
    }, [developerProfile.pinnedPortfolioIds, developerProfile.spotlightPortfolioId, updatePins]),
    onUnpin: React.useCallback((portfolioId: string) => {
      if (developerProfile.pinnedPortfolioIds.includes(portfolioId)) {
        const nextPinned = developerProfile.pinnedPortfolioIds.filter((id) => id !== portfolioId);
        updatePins(
          nextPinned,
          developerProfile.spotlightPortfolioId === portfolioId
            ? nextPinned[0] || undefined
            : developerProfile.spotlightPortfolioId
        );
      }
    }, [developerProfile.pinnedPortfolioIds, developerProfile.spotlightPortfolioId, updatePins]),
  });

  // Navigation tab switcher
  const handleNavTabChange = (tab: string) => {
    setActiveNavTab(tab);
    if (tab === "showcase") {
      setActiveSort("showcase");
    } else if (tab === "discover" && activeSort === "showcase") {
      setActiveSort("highest_rated");
    }
  };

  // Real developer count: unique developers from existing portfolios + active authenticated user
  const totalDevelopers = React.useMemo(() => {
    const authorSet = new Set<string>();
    portfolios.forEach((p) => {
      const authorIdentifier = p.author?.username || p.author?.name;
      if (authorIdentifier) {
        authorSet.add(authorIdentifier.toLowerCase().trim());
      }
    });
    if (currentUser) {
      const currentIdentifier = currentUser.username || currentUser.name || currentUser.id;
      if (currentIdentifier) {
        authorSet.add(currentIdentifier.toLowerCase().trim());
      }
    }
    return authorSet.size;
  }, [portfolios, currentUser]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navbar */}
      <Navbar
        unreadCount={unreadCount}
        isNotificationOpen={isNotificationOpen}
        setIsNotificationOpen={setIsNotificationOpen}
        notifications={notifications}
        onMarkAllAsRead={markAllAsRead}
        onMarkAsRead={markAsRead}
        onSelectPortfolioById={handleSelectPortfolioById}
        onOpenSubmitModal={() => {
          if (!currentUser) {
            requireAuth("Sign in with GitHub or Email to submit a developer portfolio.");
            return;
          }
          setIsSubmitModalOpen(true);
        }}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        activeNavTab={activeNavTab}
        setActiveNavTab={handleNavTabChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectCategory={(cat: PortfolioCategory) => {
          setActiveCategory(cat);
          setActiveNavTab("discover");
          const el = document.getElementById("showcase-bento");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
        onSelectSort={setActiveSort}
        profile={developerProfile}
        currentUser={currentUser}
        portfolios={portfolios}
        onVisitUser={setVisitedUser}
        onOpenAuthModal={() =>
          requireAuth("Sign in with GitHub or Email to access your developer portfolio.")
        }
        onSignOut={handleSignOut}
      />

      <main className="flex-1">
        {/* Dedicated Full Developer Dashboard View */}
        {activeNavTab === "dashboard" ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveNavTab("discover")}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Discover</span>
                </button>
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-600" />
                  <h1 className="text-xl font-bold text-slate-900">Developer Dashboard</h1>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl border border-slate-200 p-4 sm:p-8 shadow-xs">
              <DeveloperDashboard
                profile={developerProfile}
                onUpdateProfile={updateProfile}
                myPortfolios={myPortfolios}
                onSelectPortfolio={(p) => setSelectedPortfolio(p)}
                onDeletePortfolio={handleDeletePortfolio}
                onOpenSubmitModal={() => {
                  if (!currentUser) {
                    requireAuth("Sign in with GitHub or Email to submit a developer portfolio.");
                    return;
                  }
                  setIsSubmitModalOpen(true);
                }}
                onRequireAuth={requireAuth}
              />
            </div>
          </div>
        ) : activeNavTab === "apps" ? (
          /* Dedicated Discover Apps View */
          <div className="pt-2 animate-in fade-in duration-300">
            <DiscoverApps
              portfolios={portfolios}
              onSelectPortfolio={(p) => setSelectedPortfolio(p)}
              onLikeToggle={handleLikeToggle}
              onReact={handleReact}
              onOpenSubmitModal={() => {
                if (!currentUser) {
                  requireAuth("Sign in with GitHub or Email to submit an app.");
                  return;
                }
                setIsSubmitModalOpen(true);
              }}
              initialCategory={activeCategory}
            />
          </div>
        ) : (
          <>
            {/* Hero Section (Only in discover mode) */}
            {activeNavTab === "discover" && (
              <HeroSection
                showcasePortfolio={dailyShowcase}
                onInspectShowcase={(p) => setSelectedPortfolio(p)}
                onSubmitClick={() => {
                  if (!currentUser) {
                    requireAuth("Sign in with GitHub or Email to submit a developer portfolio.");
                    return;
                  }
                  setIsSubmitModalOpen(true);
                }}
                onExploreClick={() => {
                  router.push("/apps");
                }}
                profile={developerProfile}
                totalDevelopers={totalDevelopers}
              />
            )}

            {/* Bento Showcase Grid: Daily Spotlight, Leaderboard, Fresh from Developers */}
            <ShowcaseBanner
              portfolios={filteredPortfolios}
              allPortfolios={portfolios}
              dailyShowcase={dailyShowcase}
              weeklyShowcase={weeklyShowcase}
              onSelectPortfolio={(p) => setSelectedPortfolio(p)}
              onLikeToggle={handleLikeToggle}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onVisitUser={setVisitedUser}
              baseProfile={developerProfile}
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
      <PublicProfileModal
        userProfile={visitedUser}
        isOpen={Boolean(visitedUser)}
        onClose={() => setVisitedUser(null)}
        userPortfolios={
          visitedUser
            ? portfolios.filter(
                (p) =>
                  p.author?.username?.toLowerCase() === visitedUser.username.toLowerCase() ||
                  p.author?.name?.toLowerCase() === visitedUser.name.toLowerCase()
              )
            : []
        }
        onSelectPortfolio={(p) => setSelectedPortfolio(p)}
      />

      <PortfolioDetailModal
        portfolio={selectedPortfolio}
        onClose={() => setSelectedPortfolio(null)}
        onLikeToggle={handleLikeToggle}
        onReact={handleReact}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onRatePortfolio={handleRatePortfolio}
        currentUser={currentUser}
        onRequireAuth={requireAuth}
      />

      <SubmitPortfolioModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleSubmitPortfolio}
        existingPortfolios={portfolios}
        profile={developerProfile}
        currentUser={currentUser}
      />

      <DeveloperDashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        profile={developerProfile}
        onUpdateProfile={updateProfile}
        myPortfolios={myPortfolios}
        onSelectPortfolio={(p) => setSelectedPortfolio(p)}
        onDeletePortfolio={handleDeletePortfolio}
        onOpenSubmitModal={() => {
          if (!currentUser) {
            requireAuth("Sign in with GitHub or Email to submit a developer portfolio.");
            return;
          }
          setIsSubmitModalOpen(true);
        }}
        onRequireAuth={requireAuth}
      />

      {/* RBAC Multi-Factor Authentication & OTP Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        intentMessage={authIntentMessage}
      />
    </div>
  );
}
