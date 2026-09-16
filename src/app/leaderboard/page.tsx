"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar, Footer } from "@/components/layout";
import {
  PortfolioDetailModal,
  SubmitPortfolioModal,
  usePortfolios,
} from "@/features/portfolios";
import {
  DeveloperDashboardModal,
  useDeveloperProfile,
} from "@/features/dashboard";
import { AuthModal, useAuth } from "@/features/auth";
import { useNotifications } from "@/features/notifications";
import { useToast } from "@/hooks/useToast";
import { PortfolioCategory } from "@/types/portfolio";
import { DeveloperProfile } from "@/types/profile";
import { PublicProfileModal } from "@/components/PublicProfileModal";
import { LeaderboardContent } from "@/components/LeaderboardContent";

export default function LeaderboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [visitedUser, setVisitedUser] = useState<DeveloperProfile | null>(null);
  const [activeNavTab, setActiveNavTab] = useState("leaderboard");

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
      toast.info("Signed out successfully.");
      router.push("/");
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
    myPortfolios,
    handleLikeToggle,
    handleReact,
    handleRatePortfolio,
    handleAddComment,
    handleDeleteComment,
    handleSubmitPortfolio,
    handleDeletePortfolio,
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
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pt-14 sm:pt-16">
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
            requireAuth("Sign in with Google or GitHub to submit a developer portfolio.");
            return;
          }
          setIsSubmitModalOpen(true);
        }}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        activeNavTab={activeNavTab}
        setActiveNavTab={setActiveNavTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectCategory={(cat: PortfolioCategory) => setActiveCategory(cat)}
        onSelectSort={setActiveSort}
        profile={developerProfile}
        currentUser={currentUser}
        portfolios={portfolios}
        onVisitUser={setVisitedUser}
        onOpenAuthModal={() =>
          requireAuth("Sign in with Google or GitHub to access your developer portfolio.")
        }
        onSignOut={handleSignOut}
      />

      {/* Main Leaderboard Content */}
      <main className="flex-1">
        <LeaderboardContent
          portfolios={portfolios}
          onSelectPortfolio={(p) => setSelectedPortfolio(p)}
          onLikeToggle={handleLikeToggle}
          onReact={handleReact}
          currentUser={currentUser}
        />
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals */}
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
        onViewPortfolio={(p) => setSelectedPortfolio(p)}
        onRequireAuth={requireAuth}
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
            requireAuth("Sign in with Google or GitHub to submit a developer portfolio.");
            return;
          }
          setIsSubmitModalOpen(true);
        }}
        onRequireAuth={requireAuth}
        currentUser={currentUser}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        intentMessage={authIntentMessage}
      />
    </div>
  );
}
