"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, User, ShieldCheck } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { DeveloperDashboard, useDeveloperProfile } from "@/features/dashboard";
import {
  PortfolioDetailModal,
  SubmitPortfolioModal,
  usePortfolios,
} from "@/features/portfolios";
import { AuthModal, useAuth } from "@/features/auth";
import { useNotifications } from "@/features/notifications";
import { useToast } from "@/hooks/useToast";

export default function ProfilePage() {
  const { toast } = useToast();

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
  } = useNotifications();

  // 4. Portfolios State & Operations
  const {
    portfolios,
    selectedPortfolio,
    setSelectedPortfolio,
    isSubmitModalOpen,
    setIsSubmitModalOpen,
    myPortfolios,
    handleLikeToggle,
    handleRatePortfolio,
    handleAddComment,
    handleDeleteComment,
    handleSubmitPortfolio,
    handleDeletePortfolio,
  } = usePortfolios({
    currentUser,
    currentUsername: developerProfile.username,
    onRequireAuth: requireAuth,
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

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-slate-900 selection:text-white">
      {/* Floating Modern Header */}
      <Navbar
        unreadCount={unreadCount}
        isNotificationOpen={isNotificationOpen}
        setIsNotificationOpen={setIsNotificationOpen}
        notifications={notifications}
        onMarkAllAsRead={markAllAsRead}
        onMarkAsRead={markAsRead}
        onOpenSubmitModal={() => {
          if (!currentUser) {
            requireAuth("Sign in with GitHub or Email to submit a developer portfolio.");
            return;
          }
          setIsSubmitModalOpen(true);
        }}
        onOpenDashboard={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        activeNavTab="dashboard"
        setActiveNavTab={() => {}}
        searchQuery=""
        setSearchQuery={() => {}}
        profile={developerProfile}
        currentUser={currentUser}
        onOpenAuthModal={() =>
          requireAuth("Sign in with GitHub or Email to access your developer portfolio.")
        }
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 pt-24 sm:pt-28 pb-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
          {/* Breadcrumb Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Architecture Feed</span>
              </Link>
              <span className="text-slate-300">/</span>
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>@{developerProfile.username}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dedicated Developer Console</span>
            </div>
          </div>

          {/* Full-width Developer Dashboard Container */}
          <div className="bg-slate-50/70 rounded-3xl border border-slate-200 p-4 sm:p-8 lg:p-10 shadow-xs w-full min-w-0 max-w-full overflow-hidden">
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
      </main>

      {/* Submit Portfolio Modal */}
      <SubmitPortfolioModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleSubmitPortfolio}
        existingPortfolios={portfolios}
        profile={developerProfile}
        currentUser={currentUser}
      />

      {/* Portfolio Detail Modal */}
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

      {/* Better Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        intentMessage={authIntentMessage}
      />

      <Footer />
    </div>
  );
}
