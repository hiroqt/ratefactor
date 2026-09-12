"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { 
  Bell, 
  Search, 
  X, 
  ArrowRight,
  Command,
  Menu,
  User,
  CheckCircle2,
  ExternalLink,
  LayoutGrid,
  Settings,
  LogOut,
  PlusCircle,
  Bookmark,
  ChevronDown,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Portfolio, PortfolioCategory, SortOption, NotificationItem } from "@/types/portfolio";
import { DeveloperProfile } from "@/types/profile";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { authClient, useSession, normalizeUsername } from "@/lib/auth/client";
import { createProfileFromAuthor } from "./PublicProfileModal";

export interface NavbarProps {
  unreadCount?: number;
  onOpenNotifications?: () => void;
  isNotificationOpen?: boolean;
  setIsNotificationOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  notifications?: NotificationItem[];
  onMarkAllAsRead?: () => void;
  onMarkAsRead?: (id: string) => void;
  onSimulateIncoming?: () => void;
  onSelectPortfolioById?: (id: string) => void;
  onOpenSubmitModal: () => void;
  onOpenDashboard: () => void;
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectCategory?: (category: PortfolioCategory) => void;
  onSelectSort?: (sort: SortOption) => void;
  profile?: DeveloperProfile;
  currentUser?: any;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
  portfolios?: Portfolio[];
  onVisitUser?: (userProfile: DeveloperProfile) => void;
}

export function Navbar({
  unreadCount = 0,
  onOpenNotifications,
  isNotificationOpen = false,
  setIsNotificationOpen,
  notifications = [],
  onMarkAllAsRead = () => {},
  onMarkAsRead = () => {},
  onSimulateIncoming = () => {},
  onSelectPortfolioById = () => {},
  onOpenSubmitModal,
  onOpenDashboard,
  activeNavTab,
  setActiveNavTab,
  searchQuery,
  setSearchQuery,
  onSelectCategory,
  onSelectSort,
  profile,
  currentUser,
  onOpenAuthModal,
  onSignOut,
  portfolios = [],
  onVisitUser,
}: NavbarProps) {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [localNotificationOpen, setLocalNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const { data: session } = useSession();

  const effectiveUser = currentUser || (session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    avatar: session.user.image || profile?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
    role: (session.user as any).role || "developer",
    username: normalizeUsername(session.user.email || session.user.name),
  } : null);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
    if (onSignOut) {
      onSignOut();
    }
  };

  const effectiveNotificationOpen = setIsNotificationOpen !== undefined ? isNotificationOpen : localNotificationOpen;
  const toggleNotificationOpen = () => {
    if (setIsNotificationOpen) {
      setIsNotificationOpen(!isNotificationOpen);
    } else {
      setLocalNotificationOpen(!localNotificationOpen);
    }
  };
  const closeNotificationOpen = () => {
    if (setIsNotificationOpen) {
      setIsNotificationOpen(false);
    } else {
      setLocalNotificationOpen(false);
    }
  };
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationContainerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowSearchModal(false);
        setIsMobileMenuOpen(false);
        setIsProfileDropdownOpen(false);
        closeNotificationOpen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (showSearchModal) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [showSearchModal]);

  // Click outside and escape handler for notification dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        notificationContainerRef.current &&
        !notificationContainerRef.current.contains(e.target as Node)
      ) {
        closeNotificationOpen();
      }
    };
    if (effectiveNotificationOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [effectiveNotificationOpen]);

  // Click outside handler for profile dropdown menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(e.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [isProfileDropdownOpen]);

  // Click outside and touch handler for mobile navigation menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [isMobileMenuOpen]);

  const router = useRouter();
  const pathname = usePathname();

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  }, [pathname]);

  const handleNavClick = (tab: string) => {
    setActiveNavTab(tab);
    if (tab === "dashboard") {
      if (pathname !== "/profile") {
        router.push("/profile");
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (tab === "apps") {
      if (pathname !== "/apps") {
        router.push("/apps");
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (tab === "discover") {
      if (pathname !== "/") {
        router.push("/");
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (tab === "showcase") {
      if (pathname !== "/") {
        router.push("/#showcase-section");
      } else {
        const el = document.getElementById("showcase-section");
        el?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Compute matched developers and portfolios for search modal
  const { matchedUsers, matchedPortfolios } = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { matchedUsers: [], matchedPortfolios: [] };

    const authorMap = new Map<string, { author: Portfolio["author"]; count: number }>();
    portfolios.forEach((p) => {
      const username = p.author?.username || p.author?.name;
      if (!username) return;
      const key = username.toLowerCase();
      if (authorMap.has(key)) {
        authorMap.get(key)!.count += 1;
      } else {
        authorMap.set(key, { author: p.author, count: 1 });
      }
    });

    const userResults: { author: Portfolio["author"]; count: number; profile: DeveloperProfile }[] = [];
    authorMap.forEach(({ author, count }) => {
      const authorName = (author.name || "").toLowerCase();
      const authorUser = (author.username || "").toLowerCase();
      const authorRole = (author.role || "").toLowerCase();
      if (authorName.includes(q) || authorUser.includes(q) || authorRole.includes(q)) {
        userResults.push({
          author,
          count,
          profile: createProfileFromAuthor(author, portfolios, profile),
        });
      }
    });

    const portfolioResults = portfolios.filter((p) => {
      const titleMatch = p.title.toLowerCase().includes(q);
      const taglineMatch = p.tagline.toLowerCase().includes(q);
      const catMatch = p.category.toLowerCase().includes(q);
      const techMatch = p.techStack.some((t) => t.toLowerCase().includes(q));
      let domainMatch = false;
      try {
        if (p.portfolioUrl) domainMatch = new URL(p.portfolioUrl).hostname.toLowerCase().includes(q);
        if (!domainMatch && p.demoUrl) domainMatch = new URL(p.demoUrl).hostname.toLowerCase().includes(q);
      } catch {
        // ignore
      }
      return titleMatch || taglineMatch || catMatch || techMatch || domainMatch;
    });

    return { matchedUsers: userResults, matchedPortfolios: portfolioResults };
  }, [searchQuery, portfolios, profile]);

  return (
    <>
      {/* Top Floating Tab Navigation with Generous Left and Right Margin Gap */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none px-2 sm:px-6 md:px-12 lg:px-16">

        <div className="pointer-events-auto relative bg-white text-slate-900 rounded-b-2xl sm:rounded-b-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] border-b border-x border-slate-200/90 w-full max-w-[1400px] h-14 sm:h-16 px-3.5 sm:px-6 md:px-10 lg:px-14 flex items-center justify-between transition-all">
          
          {/* Inverted Concave Corner (Left Tab Fillet with seamless border) */}
          <svg
            className="hidden sm:block absolute top-0 -left-[20px] w-[20px] h-[20px] pointer-events-none"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M0 0 H20 V20 C20 8.954 11.046 0 0 0 Z" fill="#ffffff" />
            <path d="M20 20 C20 8.954 11.046 0 0 0" stroke="#e2e8f0" strokeWidth="1" fill="none" />
          </svg>

          {/* Inverted Concave Corner (Right Tab Fillet with seamless border) */}
          <svg
            className="hidden sm:block absolute top-0 -right-[20px] w-[20px] h-[20px] pointer-events-none"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M20 0 H0 V20 C0 8.954 8.954 0 20 0 Z" fill="#ffffff" />
            <path d="M0 20 C0 8.954 8.954 0 20 0" stroke="#e2e8f0" strokeWidth="1" fill="none" />
          </svg>

          {/* MOBILE BRAND LOGO (visible on < md, left-aligned) */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setActiveNavTab("discover");
                if (pathname !== "/") {
                  router.push("/");
                } else {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="flex items-center gap-1.5 group text-left focus:outline-none cursor-pointer"
            >
              <svg
                className="w-5 h-5 text-slate-900 group-hover:scale-110 transition-transform shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-base tracking-tight text-slate-900 font-sans">
                  RateFactor
                </span>
                <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                  beta
                </span>
              </div>
            </button>
          </div>

          {/* LEFT: Desktop Navigation Links (hidden on mobile < md) */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-3">
            {/* Showcases Link */}
            <button
              type="button"
              onClick={() => handleNavClick("showcase")}
              className={cn(
                "whitespace-nowrap text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100 cursor-pointer",
                activeNavTab === "showcase" && "text-slate-950 font-semibold bg-slate-100"
              )}
            >
              Showcases
            </button>

            {/* Discover Apps Link */}
            <button
              type="button"
              onClick={() => handleNavClick("apps")}
              className={cn(
                "whitespace-nowrap text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100 cursor-pointer",
                activeNavTab === "apps" && "text-slate-950 font-semibold bg-slate-100"
              )}
            >
              Discover Apps
            </button>

            {/* Leaderboard Link */}
            <button
              type="button"
              onClick={() => {
                if (onSelectSort) {
                  onSelectSort("highest_rated");
                }
                setActiveNavTab("discover");
                const el = document.getElementById("showcase-bento");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="whitespace-nowrap text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              Leaderboard
            </button>

            {/* Dashboard Link */}
            <button
              type="button"
              onClick={() => handleNavClick("dashboard")}
              className={cn(
                "whitespace-nowrap text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100 cursor-pointer",
                activeNavTab === "dashboard" && "text-slate-950 font-semibold bg-slate-100"
              )}
            >
              Dashboard
            </button>
          </div>

          {/* CENTER: Desktop Brand Logo (visible on md+) */}
          <div className="hidden md:flex items-center justify-center mx-2 lg:mx-6 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveNavTab("discover");
                if (pathname !== "/") {
                  router.push("/");
                } else {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="flex items-center gap-2 group text-left focus:outline-none cursor-pointer whitespace-nowrap"
            >
              <svg
                className="w-5 h-5 text-slate-900 group-hover:scale-110 transition-transform shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 font-sans">
                  RateFactor
                </span>
                <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                  beta
                </span>
              </div>
            </button>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3.5 shrink-0">
            {/* Search Icon Trigger (Unified with Dashboard animated search modal) */}
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="p-1.5 sm:p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Search portfolios (Cmd+K)"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notification Bell with live unread badge and Dropdown Menu */}
            <div className="relative shrink-0" ref={notificationContainerRef}>
              <button
                type="button"
                onClick={toggleNotificationOpen}
                className={cn(
                  "relative p-1.5 sm:p-2 rounded-full transition-colors focus:outline-none cursor-pointer",
                  effectiveNotificationOpen
                    ? "text-slate-900 bg-slate-100 ring-2 ring-slate-900/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
                aria-label={`Notifications (${unreadCount} unread)`}
                aria-expanded={effectiveNotificationOpen}
                aria-haspopup="true"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-mono font-bold text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {effectiveNotificationOpen && (
                  <NotificationDropdown
                    isOpen={effectiveNotificationOpen}
                    onClose={closeNotificationOpen}
                    notifications={notifications}
                    onMarkAllAsRead={onMarkAllAsRead}
                    onMarkAsRead={onMarkAsRead}
                    onSimulateIncoming={onSimulateIncoming}
                    onSelectPortfolioById={onSelectPortfolioById}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Signed-in Developer Profile Dropdown or Guest Sign-In */}
            {effectiveUser ? (
              <div className="relative hidden md:block shrink-0" ref={profileDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-2 py-1 px-2.5 rounded-full transition-all border cursor-pointer group whitespace-nowrap",
                    isProfileDropdownOpen
                      ? "bg-slate-100 border-slate-300 ring-2 ring-slate-900/5 shadow-2xs"
                      : "hover:bg-slate-100 border-slate-200/80 hover:border-slate-300"
                  )}
                  aria-expanded={isProfileDropdownOpen}
                  aria-haspopup="true"
                  title="Account Menu"
                >
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-slate-300 flex-shrink-0">
                      <img
                        src={effectiveUser.avatar || profile?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"}
                        alt={effectiveUser.name || "Developer"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white bg-emerald-500" />
                  </div>
                  <span className="hidden lg:inline-block text-xs font-semibold text-slate-900 truncate max-w-[120px] whitespace-nowrap">
                    {effectiveUser.name || effectiveUser.username || "Developer"}
                  </span>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isProfileDropdownOpen && "rotate-180 text-slate-700")} />
                </button>

                {/* Profile Dropdown Popover */}
                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 text-slate-900 space-y-1"
                    >
                      {/* User Header */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-slate-200 shrink-0">
                          <img
                            src={effectiveUser.avatar || profile?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"}
                            alt={effectiveUser.name || "Developer"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {effectiveUser.name || "Developer"}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 truncate">
                            @{effectiveUser.username || "developer"}
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Navigation Actions */}
                      <div className="pt-1 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onOpenSubmitModal();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold">Submit Portfolio</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            if (pathname !== "/profile") {
                              router.push("/profile?tab=dashboard");
                            } else {
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <LayoutGrid className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Dashboard</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            router.push("/profile?tab=bookmarks");
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <Bookmark className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Bookmarks</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            router.push("/profile?tab=edit");
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-left"
                        >
                          <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Settings</span>
                        </button>
                      </div>

                      <div className="border-t border-slate-100 my-1" />

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-medium shadow-xs transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Sign In</span>
              </button>
            )}

            {/* Vibrant Green Pill Button (Desktop md+ only) */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onOpenSubmitModal}
              className="hidden md:flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium text-xs sm:text-sm shadow-xs hover:shadow transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Submit Portfolio</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </motion.button>

            {/* Mobile Menu Hamburger Toggle (Visible on < md) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="flex md:hidden p-1.5 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Navigation Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden pt-16 px-3 pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Card */}
            <motion.div
              ref={mobileMenuRef}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 text-slate-900 z-50 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              {/* Profile Bar / Auth Section */}
              {effectiveUser ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (pathname !== "/profile") {
                        router.push("/profile");
                      }
                    }}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={effectiveUser.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"}
                        alt={effectiveUser.name || "Developer"}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white bg-emerald-500" />
                    </div>
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate whitespace-nowrap">
                        {effectiveUser.name || effectiveUser.username || "Developer"}
                      </span>
                      <span className="text-[9px] font-mono uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                        {effectiveUser.role || "developer"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="text-xs font-mono text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded bg-slate-200/70 ml-2 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuthModal?.();
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>Sign In with GitHub / Email</span>
                </button>
              )}

              {/* Navigation Links */}
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-2 py-1">
                  Navigation
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleNavClick("showcase");
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer",
                    activeNavTab === "showcase" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span className="font-semibold whitespace-nowrap">Showcases</span>
                  <span className="text-[10px] font-mono opacity-80 whitespace-nowrap">Daily &amp; Weekly</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleNavClick("apps");
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer",
                    activeNavTab === "apps" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span className="font-semibold whitespace-nowrap">Discover Apps</span>
                  <span className="text-[10px] font-mono opacity-80 whitespace-nowrap">All Domains</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onSelectSort) onSelectSort("highest_rated");
                    setActiveNavTab("discover");
                    const el = document.getElementById("showcase-bento");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <span className="font-semibold whitespace-nowrap">Leaderboard</span>
                  <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">Top Rated</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleNavClick("dashboard");
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer",
                    activeNavTab === "dashboard" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span className="font-semibold whitespace-nowrap">Dashboard</span>
                  <span className="text-[10px] font-mono opacity-80 whitespace-nowrap">Developer Console</span>
                </button>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSubmitModal();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>Submit Portfolio</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Cmd+K Search Modal Dialog */}
      <AnimatePresence>
        {showSearchModal && (
          <div 
            className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSearchModal(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 text-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex items-center border-b border-slate-200 pb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search portfolios, tech (Rust, Next.js), authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowSearchModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Results or Quick Filters */}
              {searchQuery.trim().length > 0 ? (
                <div className="pt-3 max-h-[60vh] overflow-y-auto space-y-4 pr-1">
                  {/* Matched Developers Section */}
                  {matchedUsers.length > 0 && (
                    <div>
                      <div className="text-[11px] font-mono text-slate-400 mb-2 uppercase tracking-wider flex items-center justify-between">
                        <span>Developers Found ({matchedUsers.length})</span>
                        <span className="text-[10px] text-slate-400 lowercase">click visit for public preview</span>
                      </div>
                      <div className="space-y-1.5">
                        {matchedUsers.map(({ author, count, profile: devProfile }) => (
                          <div
                            key={author.username || author.name}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <img
                                src={author.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"}
                                alt={author.name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {author.name}
                                  </span>
                                  {author.isVerified && (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  )}
                                  <span className="text-[11px] font-mono text-slate-500 truncate">
                                    @{author.username?.replace(/^@/, "")}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {author.role || "Developer"} • {count} {count === 1 ? "architecture" : "architectures"}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setShowSearchModal(false);
                                if (onVisitUser) {
                                  onVisitUser(devProfile);
                                }
                              }}
                              className="ml-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                            >
                              <User className="w-3.5 h-3.5" />
                              <span>Visit</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matched Architectures / Portfolios */}
                  {matchedPortfolios.length > 0 && (
                    <div>
                      <div className="text-[11px] font-mono text-slate-400 mb-2 uppercase tracking-wider">
                        Architectures &amp; Projects ({matchedPortfolios.length})
                      </div>
                      <div className="space-y-1.5">
                        {matchedPortfolios.slice(0, 6).map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setShowSearchModal(false);
                              onSelectPortfolioById(item.id);
                            }}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate transition-colors">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {item.category} • by {item.author.name} (@{item.author.username?.replace(/^@/, "")})
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[11px] font-mono text-amber-700 font-medium">
                                ★{item.rating.toFixed(1)}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-700 font-medium group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                <span>Inspect</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {matchedUsers.length === 0 && matchedPortfolios.length === 0 && (
                    <div className="py-8 text-center text-slate-500">
                      <p className="text-sm font-medium text-slate-700">No matching developers or architectures found</p>
                      <p className="text-xs text-slate-400 mt-1">Try searching by developer username (@handle), primary domain, title, or tech stack (e.g. Next.js, Rust).</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-3">
                  <div className="text-[11px] font-mono text-slate-400 mb-2 uppercase tracking-wider">
                    Quick Filters
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["Systems", "Frontend", "Fullstack", "AI / ML", "Rust", "Next.js", "WebGL"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSearchQuery(tag);
                          setShowSearchModal(false);
                          const el = document.getElementById("discovery-grid");
                          el?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors cursor-pointer"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200">ESC</kbd> to close</span>
                <span>RateFactor Registry</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
