"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  User, 
  ShieldCheck, 
  Bookmark, 
  Settings, 
  LogOut, 
  Plus, 
  ArrowUpRight, 
  Edit3, 
  Star, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink, 
  Eye, 
  Check, 
  Trash2, 
  Globe, 
  Github, 
  Twitter, 
  Linkedin, 
  FileText, 
  Layers, 
  Lock, 
  Mail, 
  Key, 
  RefreshCw, 
  ChevronRight,
  ChevronLeft,
  X,
  Code2,
  Terminal,
  Activity,
  Cpu,
  Boxes,
  Compass,
  Smile,
  Briefcase
} from "lucide-react";
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
import { useBookmarks } from "@/hooks/useBookmarks";
import { PublicProfileModal } from "@/components/PublicProfileModal";
import { DeveloperProfile, UserStatus } from "@/types/profile";
import { Portfolio } from "@/types/portfolio";
import { HookSidebar, HookSidebarItem } from "@/components/ui/hook-sidebar";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { ShowcaseShelf } from "@/components/dashboard/ShowcaseShelf";
import { CustomizePinsModal } from "@/components/dashboard/CustomizePinsModal";
import { EditStatusModal } from "@/components/dashboard/EditStatusModal";
import { EditBioModal } from "@/components/dashboard/EditBioModal";
import { PublicProfilePreview } from "@/components/dashboard/PublicProfilePreview";
import { MarkdownRenderer } from "@/components/dashboard/MarkdownRenderer";
import { cn, formatNumber, formatRating, formatJoinedDate } from "@/lib/utils";
import { getEmojiDisplay } from "@/components/PortfolioDetailModal";

type ActiveTabId = "dashboard" | "github" | "preview" | "bookmarks" | "edit" | "account";

function ProfilePageContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visitedUser, setVisitedUser] = useState<DeveloperProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Tab mapping
  const initialTab = (searchParams.get("tab") as ActiveTabId) || "dashboard";
  const [activeTab, setActiveTab] = useState<ActiveTabId>(initialTab);
  const [lastDashboardMode, setLastDashboardMode] = useState<"dashboard" | "github">(
    initialTab === "github" ? "github" : "dashboard"
  );

  useEffect(() => {
    const tabFromQuery = searchParams.get("tab") as ActiveTabId;
    if (tabFromQuery && ["dashboard", "github", "preview", "bookmarks", "edit", "account"].includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
      if (tabFromQuery === "dashboard" || tabFromQuery === "github") {
        setLastDashboardMode(tabFromQuery);
      }
    }
  }, [searchParams]);

  // Bookmarks state
  const { bookmarkedIds, toggleBookmark, isBookmarked } = useBookmarks();

  // Modals state
  const [isPinsModalOpen, setIsPinsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);

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
    handleReact,
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

  // Status and Bio update handlers
  const handleSaveStatus = (newStatus: UserStatus) => {
    const updated = {
      ...developerProfile,
      status: newStatus,
    };
    updateProfile(updated);
    setIsStatusModalOpen(false);
    toast.success(`Status updated to "${newStatus.emoji} ${newStatus.message}"`);
  };

  const handleSaveBio = (updated: DeveloperProfile) => {
    updateProfile(updated);
    setIsBioModalOpen(false);
    toast.success("Profile details and bio saved successfully.");
  };

  // Engineering metrics
  const totalUpvotes = useMemo(() => {
    return myPortfolios.reduce((acc, p) => acc + (p.likesCount || 0), 0);
  }, [myPortfolios]);

  const avgRating = useMemo(() => {
    if (myPortfolios.length === 0) return 5.0;
    const sum = myPortfolios.reduce((acc, p) => acc + (p.rating || 5), 0);
    return sum / myPortfolios.length;
  }, [myPortfolios]);

  const totalReviews = useMemo(() => {
    return myPortfolios.reduce((acc, p) => acc + (p.ratingCount || 0), 0);
  }, [myPortfolios]);

  // Bookmarked portfolios
  const bookmarkedPortfolios = useMemo(() => {
    return portfolios.filter((p) => bookmarkedIds.includes(p.id));
  }, [portfolios, bookmarkedIds]);

  // Edit Profile Form State
  const [editForm, setEditForm] = useState({
    name: developerProfile.name || "",
    username: developerProfile.username || "",
    avatar: developerProfile.avatar || "",
    role: developerProfile.role || "",
    bio: developerProfile.bio || "",
    github: developerProfile.github || "",
    twitter: developerProfile.twitter || "",
    linkedin: developerProfile.linkedin || "",
    website: developerProfile.website || "",
    readmeMarkdown: developerProfile.readmeMarkdown || "",
    statusEmoji: developerProfile.status?.emoji || "⚡",
    statusMessage: developerProfile.status?.message || "Building software",
    skillsInput: (developerProfile.skills || []).join(", "),
    availableForHire: developerProfile.availableForHire ?? true,
    customHireMessage: developerProfile.customHireMessage || "",
  });

  useEffect(() => {
    setEditForm({
      name: developerProfile.name || "",
      username: developerProfile.username || "",
      avatar: developerProfile.avatar || "",
      role: developerProfile.role || "",
      bio: developerProfile.bio || "",
      github: developerProfile.github || "",
      twitter: developerProfile.twitter || "",
      linkedin: developerProfile.linkedin || "",
      website: developerProfile.website || "",
      readmeMarkdown: developerProfile.readmeMarkdown || "",
      statusEmoji: developerProfile.status?.emoji || "⚡",
      statusMessage: developerProfile.status?.message || "Building software",
      skillsInput: (developerProfile.skills || []).join(", "),
      availableForHire: developerProfile.availableForHire ?? true,
      customHireMessage: developerProfile.customHireMessage || "",
    });
  }, [developerProfile]);

  const handleSaveEditProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const skillsArray = editForm.skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: DeveloperProfile = {
      ...developerProfile,
      name: editForm.name,
      username: editForm.username.replace(/^@/, ""),
      avatar: editForm.avatar,
      role: editForm.role,
      bio: editForm.bio,
      github: editForm.github,
      twitter: editForm.twitter,
      linkedin: editForm.linkedin,
      website: editForm.website,
      readmeMarkdown: editForm.readmeMarkdown,
      status: {
        emoji: editForm.statusEmoji,
        message: editForm.statusMessage,
        statusType: "available",
      },
      skills: skillsArray.length > 0 ? skillsArray : developerProfile.skills,
      availableForHire: editForm.availableForHire,
      customHireMessage: editForm.customHireMessage || undefined,
    };

    updateProfile(updated);
    toast.success("Developer profile updated successfully!");
  };

  // Sidebar items definition using Rare-UI HookSidebar
  // Single dynamic primary link that morphs between Architecture Deck and GitHub Studio
  const isDashboardView = activeTab === "dashboard" || activeTab === "github";
  const activePrimaryMode = (isDashboardView ? activeTab : lastDashboardMode) as "dashboard" | "github";
  
  const tabIds: ActiveTabId[] = ["dashboard", "preview", "bookmarks", "edit", "account"];
  const activeIndex = isDashboardView ? 0 : tabIds.indexOf(activeTab);

  const isGitHubMode = activePrimaryMode === "github";
  const currentDashboardTitle = isGitHubMode ? "GitHub Studio" : "Architecture Deck";
  const currentDashboardIcon = isGitHubMode ? (
    <Github className="w-3.5 h-3.5 text-slate-900" />
  ) : (
    <Layers className="w-3.5 h-3.5 text-slate-900" />
  );

  const sidebarItems: HookSidebarItem[] = [
    {
      label: currentDashboardTitle,
      icon: currentDashboardIcon,
      id: "dashboard",
      badge: (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            const nextMode = activePrimaryMode === "github" ? "dashboard" : "github";
            setActiveTab(nextMode);
            setLastDashboardMode(nextMode);
            toast.info(`Switched view to ${nextMode === "github" ? "GitHub Studio" : "Architecture Deck"}`);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              const nextMode = activePrimaryMode === "github" ? "dashboard" : "github";
              setActiveTab(nextMode);
              setLastDashboardMode(nextMode);
            }
          }}
          title="Switch view mode between Architecture Deck and GitHub Studio"
          className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 group-hover:bg-slate-200 hover:!bg-slate-300 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-2.5 h-2.5 transition-transform group-hover:rotate-45" />
          <span>{isGitHubMode ? "Deck" : "GitHub"}</span>
        </span>
      ),
    },
    {
      label: "Public Showcase",
      icon: <Eye className="w-3.5 h-3.5" />,
      id: "preview",
    },
    {
      label: "Saved Benchmarks",
      icon: <Bookmark className="w-3.5 h-3.5" />,
      id: "bookmarks",
      badge: bookmarkedPortfolios.length > 0 ? (
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
          {bookmarkedPortfolios.length}
        </span>
      ) : undefined,
    },
    {
      label: "Identity & README",
      icon: <FileText className="w-3.5 h-3.5" />,
      id: "edit",
    },
    {
      label: "Security & Session",
      icon: <Settings className="w-3.5 h-3.5" />,
      id: "account",
    },
  ];

  const handleSidebarChange = (index: number) => {
    if (index === 0) {
      if (activeTab === "dashboard") {
        setActiveTab("github");
        setLastDashboardMode("github");
        toast.info("Switched to GitHub Studio");
      } else if (activeTab === "github") {
        setActiveTab("dashboard");
        setLastDashboardMode("dashboard");
        toast.info("Switched to Architecture Deck");
      } else {
        setActiveTab(lastDashboardMode);
      }
      return;
    }
    const selected = tabIds[index];
    if (selected) {
      setActiveTab(selected);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col selection:bg-slate-900 selection:text-white">
      {/* Floating Modern Header */}
      <Navbar
        unreadCount={unreadCount}
        isNotificationOpen={isNotificationOpen}
        setIsNotificationOpen={setIsNotificationOpen}
        notifications={notifications}
        onMarkAllAsRead={markAllAsRead}
        onMarkAsRead={markAsRead}
        onSelectPortfolioById={(id) => {
          const found = portfolios.find((p) => p.id === id);
          if (found) setSelectedPortfolio(found);
        }}
        onOpenSubmitModal={() => {
          if (!currentUser) {
            requireAuth("Sign in with GitHub or Email to submit a developer portfolio.");
            return;
          }
          setIsSubmitModalOpen(true);
        }}
        onOpenDashboard={() => {
          setActiveTab("dashboard");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        activeNavTab="dashboard"
        setActiveNavTab={() => {}}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        profile={developerProfile}
        currentUser={currentUser}
        portfolios={portfolios}
        onVisitUser={setVisitedUser}
        onOpenAuthModal={() =>
          requireAuth("Sign in with GitHub or Email to access your developer portfolio.")
        }
        onSignOut={handleSignOut}
      />

      {/* Main Command Center Area */}
      <main className="flex-1 pt-20 sm:pt-24 pb-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">

          {/* Top Command Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200/80">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-mono">
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>DEV CONSOLE</span>
              </div>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                <span className="font-semibold text-slate-900">@{developerProfile.username}</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-500 capitalize">
                  {activeTab === "github" ? "GitHub Studio" : activeTab === "preview" ? "Public Showcase" : activeTab === "edit" ? "Identity & README" : activeTab === "account" ? "Security & Session" : activeTab.replace("-", " ")}
                </span>
              </div>
            </div>

            {/* Quick View Mode Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === "dashboard"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Deck</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("github")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === "github"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub Studio</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === "preview"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Public View</span>
              </button>
            </div>
          </div>

          {/* 2-Column Responsive Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* ================================================================= */}
            {/* LEFT COLUMN: Rare-UI Hook-Sidebar & Developer Context              */}
            {/* ================================================================= */}
            <aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-24">
              {/* Developer Identity Card with Editable Status */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-slate-200">
                      <img
                        src={developerProfile.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"}
                        alt={developerProfile.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {developerProfile.name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      @{developerProfile.username}
                    </p>
                  </div>
                </div>

                {/* Status Row with Direct Edit Trigger */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setIsStatusModalOpen(true)}
                    className="flex items-center gap-1.5 text-slate-700 hover:text-slate-950 p-1 -ml-1 rounded hover:bg-slate-100 transition-colors cursor-pointer group min-w-0 text-left"
                    title="Click to edit status"
                  >
                    <span className="text-xs shrink-0">{developerProfile.status?.emoji || "⚡"}</span>
                    <span className="truncate max-w-[130px] font-medium">{developerProfile.status?.message || "Active"}</span>
                    <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>

                  <span className="text-emerald-700 font-semibold uppercase text-[10px] shrink-0">
                    ONLINE
                  </span>
                </div>

                {/* Bio Snippet with Edit Action */}
                {developerProfile.bio && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {developerProfile.bio}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsBioModalOpen(true)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold mt-1 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Bio</span>
                    </button>
                  </div>
                )}

                {/* Available for Hire Quick Toggle */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      {(developerProfile.availableForHire ?? true) && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span
                        className={cn(
                          "relative inline-flex rounded-full h-2.5 w-2.5",
                          (developerProfile.availableForHire ?? true) ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      />
                    </span>
                    <span className="text-[11px] font-semibold text-slate-800">
                      {(developerProfile.availableForHire ?? true) ? "Available for Hire" : "Not for Hire"}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={developerProfile.availableForHire ?? true}
                    onClick={() => {
                      const next = !(developerProfile.availableForHire ?? true);
                      updateProfile({ ...developerProfile, availableForHire: next });
                      toast.success(next ? "Status updated: Available for Hire 🟢" : "Status updated: Not looking for work ⚪");
                    }}
                    className={cn(
                      "relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors cursor-pointer",
                      (developerProfile.availableForHire ?? true) ? "bg-emerald-500" : "bg-slate-300"
                    )}
                    title="Toggle Available for Hire status"
                  >
                    <span
                      className={cn(
                        "inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-xs",
                        (developerProfile.availableForHire ?? true) ? "translate-x-4" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Rare-UI Hook-Sidebar Navigation with Animated Hooked Rail */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold px-1 pb-1">
                  Workspace
                </div>
                <HookSidebar
                  items={sidebarItems}
                  value={activeIndex}
                  onChange={handleSidebarChange}
                  color="#0f172a"
                  dashed={true}
                  className="w-full"
                />
              </div>

              {/* Sign Out Card */}
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2 px-3 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </aside>

            {/* ================================================================= */}
            {/* RIGHT COLUMN: Command Center Panel                                */}
            {/* ================================================================= */}
            <div className="lg:col-span-9 space-y-6 w-full min-w-0">

              {/* Breadcrumbs for Non-Dashboard tabs */}
              {activeTab !== "dashboard" && activeTab !== "github" && (
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveTab(lastDashboardMode || "dashboard")}
                    className="hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    {lastDashboardMode === "github" ? (
                      <>
                        <Github className="w-3.5 h-3.5" />
                        <span>GitHub Studio</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-3.5 h-3.5" />
                        <span>Architecture Deck</span>
                      </>
                    )}
                  </button>
                  <span className="text-slate-300">/</span>
                  <span className="text-slate-900 font-bold capitalize">
                    {activeTab === "preview" ? "Public Showcase" : activeTab === "edit" ? "Identity & README" : activeTab === "account" ? "Security & Session" : "Saved Benchmarks"}
                  </span>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 1: ARCHITECTURE DECK (Telemetry & Deployed Fleet)          */}
              {/* ------------------------------------------------------------- */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  {/* Telemetry Metrics Ribbon */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                      <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                        Peer Approval
                      </div>
                      <div className="text-xl sm:text-2xl font-bold font-mono text-amber-800 flex items-center gap-1">
                        <span>★ {formatRating(avgRating)}</span>
                        <span className="text-[11px] text-slate-400 font-normal">({totalReviews})</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                      <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                        Peer Reactions
                      </div>
                      <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 flex items-center gap-1">
                        <span>{formatNumber(totalUpvotes)}</span>
                        {totalUpvotes > 0 && <span className="text-base">🤩</span>}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                      <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                        Active Fleet
                      </div>
                      <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-900">
                        {myPortfolios.length} <span className="text-xs font-normal text-slate-400">deployed</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                      <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                        GitHub Sync
                      </div>
                      <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-semibold text-slate-900">Synced</span>
                      </div>
                    </div>
                  </div>

                  {/* Architecture Fleet Table / Cards */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="font-bold text-slate-900 text-base">
                          Deployed Architecture Fleet
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Software codebases and architectures submitted to RateFactor peer review.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentUser) {
                            requireAuth("Sign in with GitHub or Email to submit a developer portfolio.");
                            return;
                          }
                          setIsSubmitModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Add Blueprint</span>
                      </button>
                    </div>

                    {myPortfolios.length === 0 ? (
                      <div className="py-12 px-4 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl">
                        <Boxes className="w-8 h-8 text-slate-300 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-900">No Architectures Deployed</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Deploy and showcase your first architecture codebase to receive peer rubrics and ratings.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser) {
                              requireAuth("Sign in with GitHub or Email to submit a developer portfolio.");
                              return;
                            }
                            setIsSubmitModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Add Blueprint</span>
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {myPortfolios.map((portfolio) => (
                          <div
                            key={portfolio.id}
                            className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/70 -mx-2 px-2 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                                <img
                                  src={portfolio.thumbnail}
                                  alt={portfolio.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-emerald-700 transition-colors">
                                    {portfolio.title}
                                  </h3>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    {portfolio.category}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">
                                  {portfolio.tagline}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                              <div className="text-xs font-mono text-amber-800 font-semibold">
                                ★ {formatRating(portfolio.rating)}
                              </div>
                              {portfolio.likesCount > 0 && (
                                <div className="text-xs font-mono text-slate-600 flex items-center gap-0.5">
                                  <span>{getEmojiDisplay(portfolio.userReaction || "star-struck")}</span>
                                  <span>{portfolio.likesCount}</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedPortfolio(portfolio)}
                                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                              >
                                Inspect
                              </button>
                              {portfolio.portfolioUrl && (
                                <a
                                  href={portfolio.portfolioUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-800 transition-colors"
                                  title="Live Demo"
                                >
                                  <ArrowUpRight className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* GitHub-Style Activity / Contribution Heatmap */}
                  <div className="pt-2">
                    <ActivityHeatmap profile={developerProfile} />
                  </div>

                  {/* Showcase Shelf */}
                  <div className="pt-2">
                    <ShowcaseShelf
                      myPortfolios={myPortfolios}
                      pinnedIds={developerProfile.pinnedPortfolioIds || []}
                      spotlightId={developerProfile.spotlightPortfolioId}
                      onCustomizePins={() => setIsPinsModalOpen(true)}
                      onSelectPortfolio={(p) => setSelectedPortfolio(p)}
                      onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
                    />
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 2: GITHUB STUDIO (Full 2-Column Dashboard with Bio/Status) */}
              {/* ------------------------------------------------------------- */}
              {activeTab === "github" && (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Github className="w-5 h-5 text-slate-900" />
                        <span>GitHub Developer Profile Studio</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Interactive GitHub-style dashboard with editable bio, live status, pinned showcases, and activity heatmaps.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsStatusModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Smile className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit Status</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBioModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit Bio &amp; Details</span>
                      </button>
                    </div>
                  </div>

                  {/* Render the full interactive DeveloperDashboard */}
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
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 3: PUBLIC SHOWCASE VIEW (In-Page Profile View, No Links)   */}
              {/* ------------------------------------------------------------- */}
              {activeTab === "preview" && (
                <div className="space-y-4">
                  <PublicProfilePreview
                    profile={developerProfile}
                    myPortfolios={myPortfolios}
                    onSelectPortfolio={(p) => setSelectedPortfolio(p)}
                  />
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 4: SAVED BENCHMARKS (Bookmarks)                           */}
              {/* ------------------------------------------------------------- */}
              {activeTab === "bookmarks" && (
                <div className="p-5 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Saved Architecture Benchmarks
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Curated codebases and peer architectures bookmarked for reference.
                    </p>
                  </div>

                  {bookmarkedPortfolios.length === 0 ? (
                    <div className="py-16 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl">
                      <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-800">No Saved Benchmarks Yet</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Explore developer architectures on the discovery feed and click the bookmark icon to save them here.
                      </p>
                      <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-black transition-colors"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Explore Discovery Feed</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {bookmarkedPortfolios.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between space-y-3 group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                                {item.category}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleBookmark(item.id)}
                                className="text-rose-500 hover:text-rose-700 text-xs font-medium cursor-pointer"
                                title="Remove bookmark"
                              >
                                Remove
                              </button>
                            </div>

                            <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                              {item.title}
                            </h4>
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {item.tagline}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium truncate">
                              @{item.author.username || item.author.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedPortfolio(item)}
                              className="px-3 py-1 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-black transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 5: IDENTITY & README                                      */}
              {/* ------------------------------------------------------------- */}
              {activeTab === "edit" && (
                <div className="p-5 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Developer Identity &amp; README
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure your public profile credentials, engineering headline, and markdown story.
                    </p>
                  </div>

                  <form onSubmit={handleSaveEditProfile} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          required
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Username
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-mono">@</span>
                          <input
                            type="text"
                            value={editForm.username}
                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                            required
                            className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Role / Title
                        </label>
                        <input
                          type="text"
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          placeholder="e.g. Senior Fullstack Architect"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Avatar URL
                        </label>
                        <input
                          type="url"
                          value={editForm.avatar}
                          onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Engineering Bio
                      </label>
                      <textarea
                        rows={3}
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        placeholder="Describe your technical background, software architecture focus, and philosophy..."
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Technologies &amp; Skills (comma separated)
                      </label>
                      <input
                        type="text"
                        value={editForm.skillsInput}
                        onChange={(e) => setEditForm({ ...editForm, skillsInput: e.target.value })}
                        placeholder="TypeScript, Next.js, React, PostgreSQL, TailwindCSS"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Github className="w-3.5 h-3.5" />
                          <span>GitHub URL</span>
                        </label>
                        <input
                          type="url"
                          value={editForm.github}
                          onChange={(e) => setEditForm({ ...editForm, github: e.target.value })}
                          placeholder="https://github.com/..."
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                          <span>LinkedIn URL</span>
                        </label>
                        <input
                          type="url"
                          value={editForm.linkedin}
                          onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <Twitter className="w-3.5 h-3.5 text-sky-500" />
                          <span>Twitter URL</span>
                        </label>
                        <input
                          type="url"
                          value={editForm.twitter}
                          onChange={(e) => setEditForm({ ...editForm, twitter: e.target.value })}
                          placeholder="https://twitter.com/..."
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Hire Availability Toggle & Custom Message */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Available for Hire</span>
                        </label>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={editForm.availableForHire}
                          onClick={() => setEditForm({ ...editForm, availableForHire: !editForm.availableForHire })}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer",
                            editForm.availableForHire ? "bg-emerald-500" : "bg-slate-300"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-xs",
                              editForm.availableForHire ? "translate-x-4.5" : "translate-x-0.5"
                            )}
                          />
                        </button>
                      </div>
                      {editForm.availableForHire && (
                        <div className="space-y-1.5">
                          <label className="text-xs text-slate-500 font-mono">
                            Custom Hire Message (optional)
                          </label>
                          <input
                            type="text"
                            value={editForm.customHireMessage}
                            onChange={(e) => setEditForm({ ...editForm, customHireMessage: e.target.value })}
                            placeholder="Open for contract engineering and full-time roles..."
                            maxLength={500}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* README Story */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>Developer README.md Markdown Story</span>
                        </label>
                        <span className="text-[11px] font-mono text-slate-400">GFM supported</span>
                      </div>
                      <textarea
                        rows={6}
                        value={editForm.readmeMarkdown}
                        onChange={(e) => setEditForm({ ...editForm, readmeMarkdown: e.target.value })}
                        placeholder="### Architectural Philosophy&#10;Describe your software design patterns and open source work..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Save Identity
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 6: SECURITY & SESSION                                     */}
              {/* ------------------------------------------------------------- */}
              {activeTab === "account" && (
                <div className="p-5 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Security &amp; Session Management
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Session tokens, authenticated email identity, and active credentials.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="text-xs font-semibold text-slate-900">
                        Session Identity
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                          <span className="text-slate-400 font-mono">Email Address</span>
                          <p className="font-semibold text-slate-900 mt-0.5">
                            {currentUser?.email || `${developerProfile.username}@developer.io`}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                          <span className="text-slate-400 font-mono">Member Since</span>
                          <p className="font-semibold text-slate-900 mt-0.5">
                            {formatJoinedDate(developerProfile.joinedDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
                      <div className="text-xs font-semibold text-rose-900">
                        Session Termination
                      </div>
                      <p className="text-xs text-rose-700">
                        Terminate session credentials and return to guest state.
                      </p>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of RateFactor</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
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

      {/* Public Profile Modal */}
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

      {/* Portfolio Detail Modal */}
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

      {/* Better Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        intentMessage={authIntentMessage}
      />

      {/* Customize Pins Modal */}
      <CustomizePinsModal
        isOpen={isPinsModalOpen}
        onClose={() => setIsPinsModalOpen(false)}
        myPortfolios={myPortfolios}
        pinnedIds={developerProfile.pinnedPortfolioIds || []}
        spotlightId={developerProfile.spotlightPortfolioId}
        onSavePins={(pinnedIds, spotlightId) => {
          updatePins(pinnedIds, spotlightId);
          setIsPinsModalOpen(false);
          toast.success("Showcase shelf updated successfully.");
        }}
        onOpenSubmitModal={() => {
          setIsPinsModalOpen(false);
          setIsSubmitModalOpen(true);
        }}
      />

      {/* Edit Status Modal */}
      <EditStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        currentStatus={developerProfile.status || { emoji: "⚡", message: "Building software", statusType: "available" }}
        onSaveStatus={handleSaveStatus}
        userAvatar={developerProfile.avatar}
        userName={developerProfile.name}
      />

      {/* Edit Bio Modal */}
      <EditBioModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        profile={developerProfile}
        onSaveProfile={handleSaveBio}
      />

      <Footer />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ProfilePageContent />
    </Suspense>
  );
}
