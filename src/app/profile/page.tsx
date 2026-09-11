"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, User, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DeveloperDashboard } from "@/components/dashboard/DeveloperDashboard";
import { PortfolioDetailModal } from "@/components/PortfolioDetailModal";
import { SubmitPortfolioModal } from "@/components/SubmitPortfolioModal";
import { INITIAL_DEVELOPER_PROFILE } from "@/data/mockProfile";
import { INITIAL_PORTFOLIOS } from "@/data/mockPortfolios";
import { INITIAL_NOTIFICATIONS } from "@/data/mockNotifications";
import { DeveloperProfile } from "@/types/profile";
import { Portfolio, NotificationItem } from "@/types/portfolio";

export default function ProfilePage() {
  // Developer Profile State
  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile>(INITIAL_DEVELOPER_PROFILE);
  const [portfolios, setPortfolios] = useState<Portfolio[]>(INITIAL_PORTFOLIOS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load persisted profile and custom portfolios
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("ratefactor_dev_profile");
      if (savedProfile) {
        setDeveloperProfile(JSON.parse(savedProfile));
      }
      const savedPortfolios = localStorage.getItem("ratefactor_portfolios");
      if (savedPortfolios) {
        setPortfolios(JSON.parse(savedPortfolios));
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

  // User's own portfolios
  const myPortfolios = useMemo(() => {
    return portfolios.filter(
      (p) =>
        p.author.username === developerProfile.username ||
        p.author.username === "arneldev"
    );
  }, [portfolios, developerProfile.username]);

  // Handle deleting portfolio
  const handleDeletePortfolio = (id: string) => {
    setPortfolios((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem("ratefactor_portfolios", JSON.stringify(filtered));
      } catch (e) {
        // ignore
      }
      return filtered;
    });
    setDeveloperProfile((prev) => {
      const updated = {
        ...prev,
        pinnedPortfolioIds: prev.pinnedPortfolioIds.filter((pId) => pId !== id),
        spotlightPortfolioId: prev.spotlightPortfolioId === id ? undefined : prev.spotlightPortfolioId,
      };
      try {
        localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
    showToast("Portfolio removed from your catalog.");
  };

  // Handle new submitted portfolio
  const handleSubmitPortfolio = (newPortfolio: Portfolio) => {
    setPortfolios((prev) => {
      const updated = [newPortfolio, ...prev];
      try {
        localStorage.setItem("ratefactor_portfolios", JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });

    if (
      newPortfolio.author.username === developerProfile.username ||
      newPortfolio.author.username === "arneldev"
    ) {
      setDeveloperProfile((prev) => {
        if (
          prev.pinnedPortfolioIds.length < 6 &&
          !prev.pinnedPortfolioIds.includes(newPortfolio.id)
        ) {
          const updated = {
            ...prev,
            pinnedPortfolioIds: [newPortfolio.id, ...prev.pinnedPortfolioIds],
            spotlightPortfolioId: prev.spotlightPortfolioId || newPortfolio.id,
          };
          try {
            localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
          } catch (e) {
            // ignore
          }
          return updated;
        }
        return prev;
      });
    }

    showToast(`"${newPortfolio.title}" submitted and added to your profile.`);
  };

  // Unread notification count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-slate-900 selection:text-white">
      {/* Floating Modern Header with Wide Margins */}
      <Navbar
        unreadCount={unreadCount}
        isNotificationOpen={isNotificationOpen}
        setIsNotificationOpen={setIsNotificationOpen}
        notifications={notifications}
        onMarkAllAsRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))}
        onMarkAsRead={(id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        onOpenDashboard={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        activeNavTab="dashboard"
        setActiveNavTab={() => {}}
        searchQuery=""
        setSearchQuery={() => {}}
        profile={developerProfile}
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
              onUpdateProfile={handleUpdateProfile}
              myPortfolios={myPortfolios}
              onSelectPortfolio={(p) => setSelectedPortfolio(p)}
              onDeletePortfolio={handleDeletePortfolio}
              onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
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
      />

      {/* Portfolio Detail Modal */}
      <PortfolioDetailModal
        portfolio={selectedPortfolio}
        onClose={() => setSelectedPortfolio(null)}
        onLikeToggle={() => {}}
        onAddComment={() => {}}
        onDeleteComment={() => {}}
        onRatePortfolio={() => {}}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg border border-slate-800 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
