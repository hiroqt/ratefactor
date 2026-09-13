"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  User, 
  ShieldCheck, 
  CheckCircle2, 
  Star, 
  Globe, 
  Github, 
  Twitter, 
  Linkedin, 
  Building2, 
  MapPin, 
  Copy, 
  Check, 
  Pin, 
  FileText, 
  ExternalLink, 
  Code2, 
  Flame, 
  Award, 
  Layers, 
  ArrowRight, 
  ArrowUpRight, 
  MessageSquare, 
  Calendar, 
  Share2, 
  Briefcase, 
  Mail, 
  Cpu, 
  Zap, 
  BookOpen, 
  Trophy, 
  CircleDot, 
  X 
} from "@/components/ui/icons";
import { Navbar, Footer } from "@/components/layout";
import { PortfolioDetailModal, SubmitPortfolioModal, usePortfolios } from "@/features/portfolios";
import { useDeveloperProfile } from "@/features/dashboard";
import { AuthModal, useAuth } from "@/features/auth";
import { useNotifications } from "@/features/notifications";
import { useToast } from "@/hooks/useToast";
import { MarkdownRenderer } from "@/components/dashboard/MarkdownRenderer";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { createProfileFromAuthor, PublicProfileModal } from "@/components/PublicProfileModal";
import { getEmojiDisplay } from "@/components/PortfolioDetailModal";
import { formatRating, formatNumber, timeAgo, formatJoinedDate, cn, normalizeAvatarUrl } from "@/lib/utils";
import { Portfolio, PortfolioCategory } from "@/types/portfolio";
import { DeveloperProfile, ShowcaseAccolade } from "@/types/profile";
import { deriveDeveloperAccolades } from "@/lib/accolades";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export default function PublicDeveloperProfilePage({ params }: PublicProfilePageProps) {
  const resolvedParams = use(params);
  const rawUsername = decodeURIComponent(resolvedParams.username || "").replace(/^@/, "").trim();
  const router = useRouter();
  const { toast } = useToast();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "submissions">("overview");
  const [visitedUser, setVisitedUser] = useState<DeveloperProfile | null>(null);
  const [hireInquiryOpen, setHireInquiryOpen] = useState(false);
  const [liveProfile, setLiveProfile] = useState<DeveloperProfile | null>(null);

  useEffect(() => {
    if (!rawUsername) return;
    let isMounted = true;
    const fetchLiveProfile = async () => {
      try {
        const res = await fetch(`/api/profile?username=${encodeURIComponent(rawUsername)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && (data.username || data.profile)) {
            setLiveProfile(data.profile || data);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };
    fetchLiveProfile();
    return () => {
      isMounted = false;
    };
  }, [rawUsername]);

  // 1. Auth State
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
      toast.success(`Authenticated as @${u.username || u.name}`);
    },
    onSignOut: () => {
      toast.info("Signed out.");
    },
  });

  // 2. Developer Profile of current user
  const {
    developerProfile: myDevProfile,
  } = useDeveloperProfile(currentUser);

  // 3. Notifications
  const {
    notifications,
    unreadCount,
    isNotificationOpen,
    setIsNotificationOpen,
    markAllAsRead,
    markAsRead,
    addNotification,
  } = useNotifications();

  // 4. Portfolios
  const {
    portfolios,
    selectedPortfolio,
    setSelectedPortfolio,
    isSubmitModalOpen,
    setIsSubmitModalOpen,
    searchQuery,
    setSearchQuery,
    handleLikeToggle,
    handleReact,
    handleRatePortfolio,
    handleAddComment,
    handleDeleteComment,
    handleSubmitPortfolio,
    handleSelectPortfolioById,
  } = usePortfolios({
    currentUser,
    currentUsername: myDevProfile.username,
    onRequireAuth: requireAuth,
    onNotify: addNotification,
    onToast: (msg) => toast.info(msg),
  });

  // 5. Resolve target developer profile from username and portfolios
  const targetAuthorPortfolios = useMemo(() => {
    if (!rawUsername) return [];
    return portfolios.filter(
      (p) =>
        p.author?.username?.toLowerCase().replace(/^@/, "") === rawUsername.toLowerCase() ||
        p.author?.name?.toLowerCase() === rawUsername.toLowerCase()
    );
  }, [portfolios, rawUsername]);

  const targetProfile: DeveloperProfile | null = useMemo(() => {
    if (!rawUsername) return null;

    // If viewing current user's profile
    if (myDevProfile.username.toLowerCase().replace(/^@/, "") === rawUsername.toLowerCase()) {
      return {
        ...myDevProfile,
        availableForHire: myDevProfile.availableForHire ?? true,
        customHireMessage:
          myDevProfile.customHireMessage ||
          "Open for contract engineering and full-time architecture roles.",
      };
    }

    // Base profile derived from live API fetch if available
    if (liveProfile && liveProfile.username?.toLowerCase().replace(/^@/, "") === rawUsername.toLowerCase()) {
      return {
        ...liveProfile,
        pinnedPortfolioIds: liveProfile.pinnedPortfolioIds || targetAuthorPortfolios.slice(0, 6).map((p) => p.id),
        spotlightPortfolioId: liveProfile.spotlightPortfolioId || targetAuthorPortfolios[0]?.id,
        skills: liveProfile.skills?.length ? liveProfile.skills : ["TypeScript", "Next.js", "React", "Node.js", "PostgreSQL"],
      };
    }

    // If matched in portfolios
    if (targetAuthorPortfolios.length > 0) {
      const author = targetAuthorPortfolios[0].author;
      return createProfileFromAuthor(author, portfolios);
    }

    // Default fallback profile for the username
    return {
      id: `profile-${rawUsername}`,
      name: rawUsername.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      username: rawUsername,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
      role: "Fullstack Software Architect",
      bio: `Software engineer and architecture enthusiast building and showcasing developer projects on RateFactor.`,
      status: {
        emoji: "⚡",
        message: "Building architectures",
        statusType: "available",
      },
      availableForHire: true,
      customHireMessage: "Open for contract engineering and full-time architecture roles.",
      github: `https://github.com/${rawUsername}`,
      pinnedPortfolioIds: targetAuthorPortfolios.slice(0, 6).map((p) => p.id),
      spotlightPortfolioId: targetAuthorPortfolios[0]?.id,
      skills: ["TypeScript", "Next.js", "React", "Node.js", "PostgreSQL"],
      joinedDate: targetAuthorPortfolios[0]?.createdAt || new Date().toISOString(),
    };
  }, [rawUsername, myDevProfile, liveProfile, targetAuthorPortfolios, portfolios]);

  // Determine whether current user owns this profile
  const isOwner = Boolean(
    currentUser &&
    targetProfile &&
    (currentUser.username?.toLowerCase().replace(/^@/, "") === targetProfile.username.toLowerCase().replace(/^@/, "") ||
     myDevProfile.username.toLowerCase().replace(/^@/, "") === targetProfile.username.toLowerCase().replace(/^@/, ""))
  );

  // Aggregate Metrics
  const totalLikes = useMemo(() => {
    return targetAuthorPortfolios.reduce((acc, p) => acc + (p.likesCount || 0), 0);
  }, [targetAuthorPortfolios]);

  const totalComments = useMemo(() => {
    return targetAuthorPortfolios.reduce((acc, p) => acc + (p.commentsCount || 0), 0);
  }, [targetAuthorPortfolios]);

  const avgRating = useMemo(() => {
    if (targetAuthorPortfolios.length === 0) return 5.0;
    const sum = targetAuthorPortfolios.reduce((acc, p) => acc + (p.rating || 5), 0);
    return sum / targetAuthorPortfolios.length;
  }, [targetAuthorPortfolios]);

  const showcaseCount = useMemo(() => {
    return targetAuthorPortfolios.filter((p) => p.isShowcase || p.showcaseType).length;
  }, [targetAuthorPortfolios]);

  const allSkills = useMemo(() => {
    const skillsFromPortfolios = targetAuthorPortfolios.flatMap((p) => p.techStack || []);
    const profileSkills = targetProfile?.skills || [];
    return Array.from(new Set([...profileSkills, ...skillsFromPortfolios]));
  }, [targetAuthorPortfolios, targetProfile]);

  // Showcase Accolades derived from portfolio showcase history
  const accolades = useMemo(() => {
    return deriveDeveloperAccolades(targetAuthorPortfolios);
  }, [targetAuthorPortfolios]);

  // Tech Stack Domain Matrix — classifies skills into domains with portfolio project counts
  const techDomainMatrix = useMemo(() => {
    const DOMAIN_KEYWORDS: Record<string, string[]> = {
      Frontend: ["react", "next.js", "nextjs", "vue", "svelte", "angular", "tailwind", "css", "html", "javascript", "typescript", "framer-motion", "radix"],
      Backend: ["node", "node.js", "nodejs", "go", "golang", "rust", "python", "fastapi", "express", "nest", "grpc", "graphql", "rest", "c++", "java"],
      Database: ["postgres", "postgresql", "supabase", "redis", "mongodb", "sqlite", "prisma", "drizzle", "mysql", "sql"],
      Cloud: ["docker", "kubernetes", "k8s", "aws", "gcp", "azure", "vercel", "fly.io", "terraform", "ci/cd", "cloudflare"],
      "AI / ML": ["ai", "ml", "pytorch", "tensorflow", "openai", "gemini", "langchain", "rag", "llm", "huggingface"],
    };

    const classify = (skill: string) => {
      const norm = skill.trim().toLowerCase();
      for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        if (keywords.some((kw) => norm.includes(kw) || kw.includes(norm))) return domain;
      }
      return "Frontend";
    };

    const domains: Record<string, { skills: string[]; projectCount: number }> = {};
    for (const domain of Object.keys(DOMAIN_KEYWORDS)) {
      domains[domain] = { skills: [], projectCount: 0 };
    }

    for (const skill of allSkills) {
      const d = classify(skill);
      if (!domains[d].skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
        domains[d].skills.push(skill);
      }
    }

    let totalUsages = 0;
    for (const p of targetAuthorPortfolios) {
      for (const tech of p.techStack || []) {
        const d = classify(tech);
        domains[d].projectCount++;
        totalUsages++;
      }
    }

    return Object.entries(domains)
      .map(([domain, data]) => ({
        domain,
        skills: data.skills,
        projectCount: data.projectCount,
        percentage: totalUsages > 0 ? Math.round((data.projectCount / totalUsages) * 100) : 0,
      }))
      .filter((d) => d.skills.length > 0 || d.projectCount > 0)
      .sort((a, b) => b.percentage - a.percentage);
  }, [allSkills, targetAuthorPortfolios]);

  // Pinned Showcase Portfolios
  const pinnedPortfolios = useMemo(() => {
    if (!targetProfile) return [];
    return (
      targetProfile.pinnedPortfolioIds
        .map((id) => targetAuthorPortfolios.find((p) => p.id === id))
        .filter(Boolean) as Portfolio[]
    );
  }, [targetProfile, targetAuthorPortfolios]);

  const spotlightPortfolio = useMemo(() => {
    if (!targetProfile) return null;
    return (
      (targetProfile.spotlightPortfolioId &&
        targetAuthorPortfolios.find((p) => p.id === targetProfile.spotlightPortfolioId)) ||
      pinnedPortfolios[0] ||
      targetAuthorPortfolios[0] ||
      null
    );
  }, [targetProfile, targetAuthorPortfolios, pinnedPortfolios]);

  const secondaryShowcases = useMemo(() => {
    return pinnedPortfolios.filter((p) => p.id !== spotlightPortfolio?.id);
  }, [pinnedPortfolios, spotlightPortfolio]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Public profile link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareTwitter = () => {
    if (typeof window !== "undefined" && targetProfile) {
      const text = encodeURIComponent(
        `Check out @${targetProfile.username}'s developer architecture portfolio on @RateFactor!\n${window.location.href}`
      );
      window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
    }
  };

  if (!targetProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar
          unreadCount={unreadCount}
          onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
          onOpenDashboard={() => router.push("/profile")}
          activeNavTab=""
          setActiveNavTab={() => {}}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          profile={myDevProfile}
          currentUser={currentUser}
          portfolios={portfolios}
          onVisitUser={setVisitedUser}
        />
        <main className="flex-1 flex items-center justify-center p-6 pt-24">
          <div className="text-center max-w-md">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-900">Developer Profile Not Found</h2>
            <p className="text-xs text-slate-500 mt-1">We couldn't locate a developer profile for "@{rawUsername}".</p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-black transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Discovery Feed</span>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col selection:bg-slate-900 selection:text-white">
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
        onOpenDashboard={() => router.push("/profile")}
        activeNavTab=""
        setActiveNavTab={() => {}}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        profile={myDevProfile}
        currentUser={currentUser}
        portfolios={portfolios}
        onVisitUser={setVisitedUser}
        onOpenAuthModal={() =>
          requireAuth("Sign in with GitHub or Email to access developer features.")
        }
        onSignOut={handleSignOut}
      />

      {/* Main Container matching Dashboard width and padding */}
      <main className="flex-1 pt-20 sm:pt-24 pb-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 space-y-6">

          {/* Breadcrumb Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Architecture Feed</span>
              </Link>
              <span className="text-slate-300">/</span>
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-semibold text-slate-900">@{targetProfile.username}</span>
              </div>
            </div>

            {/* View Switcher Tabs & Share Actions */}
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <div className="flex items-center rounded-xl bg-slate-200/80 p-1 border border-slate-200 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "px-3 sm:px-3.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer",
                    activeTab === "overview"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Showcase &amp; Bio
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("submissions")}
                  className={cn(
                    "px-3 sm:px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                    activeTab === "submissions"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <span>All Projects</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                    {targetAuthorPortfolios.length}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    <span className="text-emerald-700">Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareTwitter}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0f1419] hover:bg-black text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Twitter className="w-3.5 h-3.5 text-sky-400" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MAIN 2-COLUMN DASHBOARD LAYOUT                                            */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0 max-w-full">
            
            {/* ======================================================================= */}
            {/* LEFT COLUMN: GitHub-Style Developer Profile Sidebar (4 cols)            */}
            {/* ======================================================================= */}
            <div className="lg:col-span-4 space-y-4 w-full min-w-0">
              
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 w-full min-w-0 overflow-hidden">
                
                {/* Avatar with Status Badge & Joined Date */}
                <div className="flex items-start justify-between gap-3">
                  <div className="relative group">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-slate-100 shadow-sm border border-slate-200 bg-slate-100">
                      <img
                        src={normalizeAvatarUrl(targetProfile.avatar, targetProfile.username)}
                        alt={targetProfile.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80";
                        }}
                      />
                    </div>

                    {/* Status Indicator Dot */}
                    <span
                      className={cn(
                        "absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white shadow-xs",
                        targetProfile.status.isBusy
                          ? "bg-amber-500"
                          : targetProfile.status.statusType === "offline"
                          ? "bg-slate-400"
                          : "bg-emerald-500"
                      )}
                      title={targetProfile.status.isBusy ? "Busy" : "Active & Open"}
                    />
                  </div>

                  {/* Enhanced Joined Date Format (Jan-Dec DD, YYYY) */}
                  <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-mono font-medium border border-slate-200 shrink-0">
                    Joined {formatJoinedDate(targetProfile.joinedDate)}
                  </span>
                </div>

                {/* GitHub Status Bubble */}
                {(targetProfile.status.message || targetProfile.status.emoji) && (
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                    <span className="text-base">
                      {targetProfile.status.emoji || "⚡"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {targetProfile.status.message}
                      </div>
                      {targetProfile.status.isBusy && (
                        <div className="text-[10px] text-amber-700 font-mono font-medium">• Busy</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Name, Handle, Pronouns, Role */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{targetProfile.name}</h1>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500 min-w-0">
                    <span className="truncate">@{targetProfile.username}</span>
                    {targetProfile.pronouns && <span className="shrink-0">• {targetProfile.pronouns}</span>}
                  </div>
                  <p className="text-xs text-indigo-700 font-semibold mt-1 break-words">
                    {targetProfile.role || "Fullstack Software Architect"}
                  </p>
                </div>

                {/* Bio */}
                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-2xl border border-slate-100 break-words [overflow-wrap:anywhere]">
                  {targetProfile.bio}
                </div>

                {/* Available for Hire Beacon & Contact Trigger */}
                {targetProfile.availableForHire && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-semibold text-emerald-900">Available for Hire</span>
                      </div>
                      <Briefcase className="w-4 h-4 text-emerald-600" />
                    </div>
                    {targetProfile.customHireMessage && (
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        {targetProfile.customHireMessage}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setHireInquiryOpen(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Contact / Hire Inquiry</span>
                    </button>
                  </div>
                )}

                {/* Metadata / Links (GitHub Style) */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600 min-w-0">
                  {targetProfile.company && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate font-medium">{targetProfile.company}</span>
                    </div>
                  )}
                  {targetProfile.location && (
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{targetProfile.location}</span>
                    </div>
                  )}
                  {targetProfile.website && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                      <a
                        href={targetProfile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 hover:underline truncate font-medium flex items-center gap-1"
                      >
                        <span className="truncate">{targetProfile.website.replace(/^https?:\/\//, "")}</span>
                        <ArrowUpRight className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                  {targetProfile.github && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Github className="w-3.5 h-3.5 text-slate-900 flex-shrink-0" />
                      <a
                        href={targetProfile.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-800 hover:text-black hover:underline truncate font-medium"
                      >
                        {targetProfile.github.replace(/^https?:\/\/github\.com\//, "@")}
                      </a>
                    </div>
                  )}
                  {targetProfile.twitter && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Twitter className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                      <a
                        href={targetProfile.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-600 hover:text-sky-800 hover:underline truncate font-medium"
                      >
                        {targetProfile.twitter.replace(/^https?:\/\/twitter\.com\//, "@")}
                      </a>
                    </div>
                  )}
                  {targetProfile.linkedin && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Linkedin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <a
                        href={targetProfile.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline truncate font-medium"
                      >
                        {targetProfile.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "in/")}
                      </a>
                    </div>
                  )}
                </div>

                {/* Skills Tags */}
                {allSkills.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 font-semibold">
                      Technologies
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allSkills.map((skill) => (
                        <span
                          key={skill}
                          className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Engagement Matrix Quick Metrics Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
                  Engagement Matrix
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-mono">Rating Score</div>
                    <div className="text-lg font-mono font-bold text-amber-800 mt-0.5">
                      {formatRating(avgRating)}★
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-mono">Peer Likes</div>
                    <div className="text-lg font-mono font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                      <span>{formatNumber(totalLikes)}</span>
                      {totalLikes > 0 && <span className="text-sm">🤩</span>}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-mono">Comments</div>
                    <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                      {formatNumber(totalComments)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-mono">Architectures</div>
                    <div className="text-lg font-mono font-bold text-indigo-900 mt-0.5">
                      {targetAuthorPortfolios.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Showcase Accolades & Awards */}
              {accolades.length > 0 && (
                <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    Showcase Accolades
                  </div>
                  <div className="space-y-2">
                    {accolades.map((accolade) => (
                      <div
                        key={accolade.id}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-xl border",
                          accolade.type === "weekly"
                            ? "bg-amber-50 border-amber-200"
                            : "bg-orange-50 border-orange-200"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg shrink-0",
                          accolade.type === "weekly" ? "bg-amber-100 text-amber-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {accolade.type === "weekly" ? (
                            <Award className="w-4 h-4" />
                          ) : (
                            <Flame className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {accolade.title}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {accolade.portfolioTitle} • {timeAgo(accolade.awardedDate)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tech Stack Domain Matrix */}
              {techDomainMatrix.length > 0 && (
                <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    Tech Stack Matrix
                  </div>
                  <div className="space-y-2.5">
                    {techDomainMatrix.map((entry) => {
                      const domainColors: Record<string, { bar: string; text: string; bg: string }> = {
                        Frontend: { bar: "bg-amber-500", text: "text-amber-800", bg: "bg-amber-50" },
                        Backend: { bar: "bg-indigo-500", text: "text-indigo-800", bg: "bg-indigo-50" },
                        Database: { bar: "bg-emerald-500", text: "text-emerald-800", bg: "bg-emerald-50" },
                        Cloud: { bar: "bg-sky-500", text: "text-sky-800", bg: "bg-sky-50" },
                        "AI / ML": { bar: "bg-purple-500", text: "text-purple-800", bg: "bg-purple-50" },
                      };
                      const colors = domainColors[entry.domain] || domainColors.Frontend;
                      return (
                        <div key={entry.domain} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={cn("font-semibold font-mono", colors.text)}>
                              {entry.domain}
                            </span>
                            <span className="text-slate-500 font-mono tabular-nums">
                              {entry.percentage}% • {entry.projectCount} projects
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
                              style={{ width: `${Math.max(entry.percentage, 4)}%` }}
                            />
                          </div>
                          {entry.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {entry.skills.slice(0, 5).map((skill) => (
                                <span
                                  key={skill}
                                  className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded-md border border-slate-200", colors.bg, colors.text)}
                                >
                                  {skill}
                                </span>
                              ))}
                              {entry.skills.length > 5 && (
                                <span className="text-[10px] font-mono text-slate-400 px-1">
                                  +{entry.skills.length - 5}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* ======================================================================= */}
            {/* RIGHT COLUMN: Showcase Shelf, All Projects & README.md (8 cols)        */}
            {/* ======================================================================= */}
            <div className="lg:col-span-8 space-y-6 w-full min-w-0 max-w-full">
              
              {activeTab === "overview" && (
                <>
                  {/* 1. Showcase Shelf (Pinned / Spotlight Architectures) */}
                  <section className="space-y-4 w-full min-w-0 max-w-full">
                    <div className="flex items-center justify-between gap-2.5">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <Pin className="w-4 h-4 text-slate-900 shrink-0" />
                          <h2 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                            Showcase Shelf (Pinned Architectures)
                          </h2>
                          <span className="whitespace-nowrap shrink-0 inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shadow-2xs font-medium">
                            <span className="font-bold text-slate-900">{pinnedPortfolios.length}</span> / 6 pinned
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Architectures highlighted on @{targetProfile.username}'s public profile for peer evaluation.
                        </p>
                      </div>
                    </div>

                    {pinnedPortfolios.length === 0 ? (
                      <div className="p-8 border border-dashed border-slate-200 rounded-3xl bg-white text-center space-y-2">
                        <Pin className="w-6 h-6 text-slate-300 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-900">No Showcase Portfolios Pinned Yet</h4>
                        <p className="text-xs text-slate-500">
                          @{targetProfile.username} has not pinned specific architectures to this shelf yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Primary Spotlight Card */}
                        {spotlightPortfolio && (
                          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden group w-full min-w-0">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10 flex flex-col md:flex-row gap-5 justify-between w-full min-w-0">
                              <div className="space-y-3 max-w-xl w-full min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1 font-semibold">
                                    <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                                    Primary Spotlight Showcase
                                  </span>
                                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
                                    {spotlightPortfolio.category}
                                  </span>
                                  {spotlightPortfolio.isShowcase && (
                                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                                      <Award className="w-2.5 h-2.5" />
                                      Platform Awardee
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                                    {spotlightPortfolio.title}
                                  </h3>
                                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                                    {spotlightPortfolio.tagline}
                                  </p>
                                </div>

                                {/* Tech stack chips */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {spotlightPortfolio.techStack.map((tech) => (
                                    <span
                                      key={tech}
                                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-white/90 border border-white/10"
                                    >
                                      {tech}
                                    </span>
                                  ))}
                                </div>

                                {/* Rating & Stats */}
                                <div className="flex items-center gap-4 pt-2 text-xs font-mono text-slate-300 flex-wrap">
                                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                                    ★ {formatRating(spotlightPortfolio.rating)}
                                    <span className="text-slate-400 font-normal">
                                      ({spotlightPortfolio.ratingCount} reviews)
                                    </span>
                                  </div>
                                  {spotlightPortfolio.likesCount > 0 && (
                                    <div className="flex items-center gap-1 text-amber-300">
                                      <span className="text-sm">{getEmojiDisplay(spotlightPortfolio.userReaction || "star-struck")}</span>
                                      <span>{spotlightPortfolio.likesCount}</span>
                                    </div>
                                  )}
                                  {spotlightPortfolio.commentsCount > 0 && (
                                    <div className="flex items-center gap-1 text-slate-300">
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      <span>{spotlightPortfolio.commentsCount}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right Media and Actions */}
                              <div className="flex flex-col justify-between sm:items-end gap-3 flex-shrink-0">
                                <div className="w-full sm:w-56 aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 shadow-lg relative bg-slate-800">
                                  <img
                                    src={spotlightPortfolio.thumbnail}
                                    alt={spotlightPortfolio.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  {spotlightPortfolio.portfolioUrl && (
                                    <a
                                      href={spotlightPortfolio.portfolioUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors flex items-center gap-1 shadow-xs"
                                    >
                                      <span>Live Demo</span>
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                    </a>
                                  )}

                                  {spotlightPortfolio.githubUrl && (
                                    <a
                                      href={spotlightPortfolio.githubUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
                                      title="GitHub Repo"
                                    >
                                      <Github className="w-4 h-4" />
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setSelectedPortfolio(spotlightPortfolio)}
                                    className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors border border-white/10 cursor-pointer"
                                  >
                                    Inspect Deeply
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Secondary Pinned Cards */}
                        {secondaryShowcases.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full min-w-0">
                            {secondaryShowcases.map((portfolio) => (
                              <div
                                key={portfolio.id}
                                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group min-w-0 w-full overflow-hidden"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Pin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-emerald-700 transition-colors">
                                        {portfolio.title}
                                      </h4>
                                    </div>
                                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
                                      {portfolio.category}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                    {portfolio.tagline}
                                  </p>

                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {portfolio.techStack.slice(0, 4).map((tech) => (
                                      <span
                                        key={tech}
                                        className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-50 text-slate-600 border border-slate-200"
                                      >
                                        {tech}
                                      </span>
                                    ))}
                                    {portfolio.techStack.length > 4 && (
                                      <span className="text-[10px] font-mono text-slate-400">
                                        +{portfolio.techStack.length - 4}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
                                    <span className="text-amber-800 font-semibold">
                                      ★ {formatRating(portfolio.rating)}
                                    </span>
                                    {portfolio.likesCount > 0 && (
                                      <span className="flex items-center gap-0.5">
                                        <span className="text-xs">{getEmojiDisplay(portfolio.userReaction || "star-struck")}</span>
                                        <span>{portfolio.likesCount}</span>
                                      </span>
                                    )}
                                    {portfolio.commentsCount > 0 && <span>{portfolio.commentsCount} 💬</span>}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {portfolio.portfolioUrl && (
                                      <a
                                        href={portfolio.portfolioUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                        title="Live Demo"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedPortfolio(portfolio)}
                                      className="px-2.5 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                                    >
                                      Inspect
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                  {/* 2. GitHub-Style Activity / Contribution Heatmap */}
                  <ActivityHeatmap profile={targetProfile} readOnly={!isOwner} />

                  {/* 3. GitHub Profile README.md Card (if present) */}
                  {targetProfile.readmeMarkdown && targetProfile.readmeMarkdown.trim() && (
                    <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-700" />
                          <span className="text-xs sm:text-sm font-mono font-bold text-slate-900">
                            {targetProfile.username} / README.md
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Public Story
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <MarkdownRenderer content={targetProfile.readmeMarkdown} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* All Projects Submissions Tab */}
              {activeTab === "submissions" && (
                <section className="space-y-4 w-full min-w-0 max-w-full">
                  <div className="flex items-center justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-900" />
                        <h2 className="font-bold text-slate-900 text-base">
                          All Projects &amp; Architectures ({targetAuthorPortfolios.length})
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Complete portfolio repository and codebases submitted by @{targetProfile.username}.
                      </p>
                    </div>
                  </div>

                  {targetAuthorPortfolios.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-200 rounded-3xl bg-white text-center space-y-2">
                      <Code2 className="w-6 h-6 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-900">No Projects Published Yet</h4>
                      <p className="text-xs text-slate-500">
                        @{targetProfile.username} has not submitted any projects to RateFactor.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {targetAuthorPortfolios.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between group cursor-pointer"
                          onClick={() => setSelectedPortfolio(item)}
                        >
                          <div className="space-y-2.5">
                            <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                              />
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 text-slate-800 text-[10px] font-mono font-medium shadow-2xs">
                                {item.category}
                              </span>
                              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[10px] font-mono font-bold flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                                <span>{formatRating(item.rating)}</span>
                              </span>
                            </div>

                            <div>
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {item.title}
                              </h3>
                              <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                                {item.tagline}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {item.techStack.slice(0, 4).map((tech) => (
                                <span
                                  key={tech}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                              {item.likesCount > 0 && (
                                <span className="flex items-center gap-0.5 text-slate-700">
                                  <span>{getEmojiDisplay(item.userReaction || "star-struck")}</span>
                                  <span>{item.likesCount}</span>
                                </span>
                              )}
                              <span>{timeAgo(item.createdAt)}</span>
                            </div>

                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 group-hover:bg-indigo-600 text-white text-xs font-medium transition-colors">
                              <span>Inspect</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Portfolio Detail Modal for Inspecting Architectures */}
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

      {/* Public Profile Modal (When searching and visiting another user) */}
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

      {/* Submit Portfolio Modal */}
      <SubmitPortfolioModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleSubmitPortfolio}
        existingPortfolios={portfolios}
        profile={myDevProfile}
        currentUser={currentUser}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        intentMessage={authIntentMessage}
      />

      {/* Hire Inquiry Modal */}
      {hireInquiryOpen && targetProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md modal-backdrop"
            onClick={() => setHireInquiryOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-[#18181b] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl p-6 space-y-5 z-10 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Contact {targetProfile.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">@{targetProfile.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHireInquiryOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {targetProfile.customHireMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                &ldquo;{targetProfile.customHireMessage}&rdquo;
              </div>
            )}

            <div className="space-y-2.5">
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                Reach Out Via
              </div>
              {targetProfile.website && (
                <a
                  href={targetProfile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group"
                >
                  <Globe className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 flex-1 truncate">
                    {targetProfile.website.replace(/^https?:\/\//, "")}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white" />
                </a>
              )}
              {targetProfile.github && (
                <a
                  href={targetProfile.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group"
                >
                  <Github className="w-4 h-4 text-slate-900 dark:text-white" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 flex-1 truncate">
                    {targetProfile.github.replace(/^https?:\/\/github\.com\//, "@")}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white" />
                </a>
              )}
              {targetProfile.twitter && (
                <a
                  href={targetProfile.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group"
                >
                  <Twitter className="w-4 h-4 text-sky-500 dark:text-cyan-400" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 flex-1 truncate">
                    {targetProfile.twitter.replace(/^https?:\/\/twitter\.com\//, "@")}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white" />
                </a>
              )}
              {targetProfile.linkedin && (
                <a
                  href={targetProfile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors group"
                >
                  <Linkedin className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-slate-800 flex-1 truncate">
                    {targetProfile.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "in/")}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                </a>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-mono text-center">
                Reaching out through these channels connects you directly with the developer.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
