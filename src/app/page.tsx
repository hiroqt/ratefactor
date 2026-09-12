"use client";

import React, { useState } from "react";
import { Navbar, Footer } from "@/components/layout";
import {
  HeroSection,
  ShowcaseBanner,
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
import { PortfolioCategory } from "@/types/portfolio";
import { Terminal, ArrowLeft } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
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
  } = usePortfolios({
    currentUser,
    currentUsername: developerProfile.username,
    onRequireAuth: requireAuth,
    onNotify: addNotification,
    onToast: (msg) => toast.info(msg),
    onAutoPin: (newPortfolio) => {
      if (
        developerProfile.pinnedPortfolioIds.length < 6 &&
        !developerProfile.pinnedPortfolioIds.includes(newPortfolio.id)
      ) {
        updatePins(
          [newPortfolio.id, ...developerProfile.pinnedPortfolioIds],
          developerProfile.spotlightPortfolioId || newPortfolio.id
        );
      }
    },
    onUnpin: (portfolioId) => {
      if (developerProfile.pinnedPortfolioIds.includes(portfolioId)) {
        const nextPinned = developerProfile.pinnedPortfolioIds.filter((id) => id !== portfolioId);
        updatePins(
          nextPinned,
          developerProfile.spotlightPortfolioId === portfolioId
            ? nextPinned[0] || undefined
            : developerProfile.spotlightPortfolioId
        );
      }
    },
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
                onSubmitClick={() => {
                  if (!currentUser) {
                    requireAuth("Sign in with GitHub or Email to submit a developer portfolio.");
                    return;
                  }
                  setIsSubmitModalOpen(true);
                }}
                onExploreClick={() => {
                  const el = document.getElementById("showcase-bento");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                profile={developerProfile}
                totalDevelopers={1420 + portfolios.length}
              />
            )}

            {/* Bento Showcase Grid: Daily Spotlight, Leaderboard, Fresh from Developers */}
            <ShowcaseBanner
              portfolios={portfolios}
              dailyShowcase={dailyShowcase}
              weeklyShowcase={weeklyShowcase}
              onSelectPortfolio={(p) => setSelectedPortfolio(p)}
              onLikeToggle={handleLikeToggle}
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
