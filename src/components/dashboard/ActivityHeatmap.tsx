"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  Activity, 
  Flame, 
  Github, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  BookOpen, 
  Users,
  AlertCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Settings,
  Edit3,
  Trash2
} from "@/components/ui/icons";
import { cn, formatNumber } from "@/lib/utils";
import { DeveloperProfile } from "@/types/profile";
import { authClient } from "@/lib/auth/client";

interface ActivityDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ActivityHeatmapProps {
  profile?: DeveloperProfile;
  onUpdateProfile?: (updated: DeveloperProfile) => void;
  onRequireAuth?: (intent: string) => void;
  readOnly?: boolean;
}

function generateEmptyHeatmap(): ActivityDay[] {
  const days: ActivityDay[] = [];
  const today = new Date();
  for (let i = 370; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().split("T")[0],
      count: 0,
      level: 0,
    });
  }
  return days;
}

function formatDayTooltip(dateStr: string, count: number): { label: string; dateFormatted: string } {
  try {
    const d = new Date(dateStr + "T00:00:00");
    const dateFormatted = d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const label = count === 0 ? "No contributions" : `${count} contribution${count === 1 ? "" : "s"}`;
    return { label, dateFormatted };
  } catch {
    return { label: `${count} contributions`, dateFormatted: dateStr };
  }
}

export function ActivityHeatmap({
  profile,
  onUpdateProfile,
  onRequireAuth,
  readOnly = false,
}: ActivityHeatmapProps) {
  const [heatmapDays, setHeatmapDays] = useState<ActivityDay[]>(generateEmptyHeatmap());
  const [hoveredDay, setHoveredDay] = useState<{ day: ActivityDay; x: number; y: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [changeInput, setChangeInput] = useState("");
  const [stats, setStats] = useState<{
    totalContributions?: number;
    currentStreak?: number;
    publicRepos?: number;
    followers?: number;
    lastSyncedAt?: string;
  }>({
    totalContributions: profile?.githubSync?.totalContributions,
    currentStreak: profile?.githubSync?.currentStreak,
    publicRepos: profile?.githubSync?.publicRepos,
    followers: profile?.githubSync?.followers,
    lastSyncedAt: profile?.githubSync?.lastSyncedAt,
  });

  const lastFetchedUserRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Clean and extract GitHub username, prioritizing explicit profile.github over githubSync
  const extractGithubHandle = (val?: string) => {
    if (!val) return "";
    return val
      .replace(/^https?:\/\/github\.com\//i, "")
      .replace(/\/$/, "")
      .replace(/^@/, "")
      .trim();
  };

  const explicitGithub = extractGithubHandle(profile?.github);
  const syncGithub = extractGithubHandle(profile?.githubSync?.username);
  const activeGithubUsername = explicitGithub || syncGithub || "";

  const isConnected = Boolean(
    activeGithubUsername &&
      activeGithubUsername !== "developer" &&
      activeGithubUsername !== "user-default" &&
      (profile?.githubSync?.connected || Boolean(profile?.github))
  );

  // Auto-scroll to latest month (far right)
  const scrollToLatest = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, []);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: "smooth" });
    }
  };

  const fetchContributions = useCallback(
    async (usernameToFetch: string, force = false) => {
      if (!usernameToFetch || usernameToFetch === "developer" || usernameToFetch === "user-default") return;
      if (!force && lastFetchedUserRef.current === usernameToFetch) return;
      lastFetchedUserRef.current = usernameToFetch;

      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(
          `/api/github/contributions?username=${encodeURIComponent(usernameToFetch)}${force ? "&force=true" : ""}`
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch GitHub contributions");
        }

        if (data.days && Array.isArray(data.days) && data.days.length > 0) {
          setHeatmapDays(data.days);
        }

        setStats({
          totalContributions: data.totalContributions,
          currentStreak: data.currentStreak,
          publicRepos: data.profile?.publicRepos,
          followers: data.profile?.followers,
          lastSyncedAt: data.syncedAt || "Just now",
        });

        if (profile && onUpdateProfile) {
          const updated: DeveloperProfile = {
            ...profile,
            name: data.profile?.name || profile.name || usernameToFetch,
            bio:
              data.profile?.bio !== undefined && data.profile?.bio !== ""
                ? data.profile.bio
                : profile.bio,
            readmeMarkdown:
              data.readmeMarkdown !== undefined && data.readmeMarkdown !== ""
                ? data.readmeMarkdown
                : profile.readmeMarkdown,
            avatar: data.profile?.avatar || profile.avatar,
            company: data.profile?.company || profile.company || "",
            location: data.profile?.location || profile.location || "",
            website: data.profile?.website || profile.website || "",
            twitter: data.profile?.twitter || profile.twitter || "",
            linkedin: data.profile?.linkedin || profile.linkedin || "",
            github: profile.github || `https://github.com/${usernameToFetch}`,
            githubSync: {
              connected: true,
              username: usernameToFetch,
              avatarUrl: data.profile?.avatar,
              profileUrl: data.profile?.profileUrl || `https://github.com/${usernameToFetch}`,
              totalContributions: data.totalContributions,
              currentStreak: data.currentStreak,
              longestStreak: data.longestStreak,
              publicRepos: data.profile?.publicRepos,
              followers: data.profile?.followers,
              lastSyncedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          };
          onUpdateProfile(updated);
        }
      } catch (err: any) {
        setErrorMsg(err?.message || "Could not load GitHub contributions.");
      } finally {
        setIsLoading(false);
      }
    },
    [profile, onUpdateProfile]
  );

  useEffect(() => {
    if (isConnected && lastFetchedUserRef.current !== activeGithubUsername) {
      fetchContributions(activeGithubUsername);
    }
  }, [activeGithubUsername, isConnected, fetchContributions]);

  useEffect(() => {
    scrollToLatest();
    const t = setTimeout(scrollToLatest, 150);
    return () => clearTimeout(t);
  }, [heatmapDays, scrollToLatest]);

  const handleConnectOAuth = async () => {
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: typeof window !== "undefined" ? window.location.href : "/",
      });
    } catch (err: any) {
      if (onRequireAuth) {
        onRequireAuth("Sign in with GitHub to link your live contribution activity.");
      } else {
        setErrorMsg(err?.message || "Failed to initiate GitHub OAuth.");
      }
    }
  };

  const handleSync = async () => {
    if (!activeGithubUsername) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: activeGithubUsername }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");

      if (data.contributions?.days && Array.isArray(data.contributions.days)) {
        setHeatmapDays(data.contributions.days);
      }

      setStats({
        totalContributions: data.contributions?.totalContributions,
        currentStreak: data.contributions?.currentStreak,
        publicRepos: data.profile?.publicRepositoryCount || data.repositories?.length,
        followers: data.profile?.followers,
        lastSyncedAt: data.syncedAt || "Just now",
      });

      if (profile && onUpdateProfile) {
        const updated: DeveloperProfile = {
          ...profile,
          name: data.profile?.displayName || profile.name || activeGithubUsername,
          bio:
            data.profile?.bio !== undefined && data.profile?.bio !== ""
              ? data.profile.bio
              : profile.bio,
          readmeMarkdown:
            data.profileReadme?.contentMarkdown ||
            data.readmeMarkdown ||
            profile.readmeMarkdown,
          avatar: data.profile?.avatarUrl || profile.avatar,
          company: data.profile?.company || profile.company || "",
          location: data.profile?.location || profile.location || "",
          website: data.profile?.website || profile.website || "",
          twitter: data.profile?.twitter || profile.twitter || "",
          linkedin: data.profile?.linkedin || profile.linkedin || "",
          github:
            data.profile?.profileUrl ||
            profile.github ||
            `https://github.com/${activeGithubUsername}`,
          githubSync: {
            connected: true,
            username: activeGithubUsername,
            avatarUrl: data.profile?.avatarUrl || profile.avatar,
            profileUrl: data.profile?.profileUrl || `https://github.com/${activeGithubUsername}`,
            totalContributions: data.contributions?.totalContributions,
            currentStreak: data.contributions?.currentStreak,
            longestStreak: data.contributions?.longestStreak,
            publicRepos: data.profile?.publicRepositoryCount || data.repositories?.length,
            followers: data.profile?.followers,
            lastSyncedAt: data.syncedAt || "Just now",
          },
        };
        onUpdateProfile(updated);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not sync GitHub data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setShowSettingsDropdown(false);
    setIsChanging(false);
    lastFetchedUserRef.current = null;
    setHeatmapDays(generateEmptyHeatmap());
    setStats({
      totalContributions: 0,
      currentStreak: 0,
      publicRepos: 0,
      followers: 0,
      lastSyncedAt: undefined,
    });

    if (profile && onUpdateProfile) {
      const updated: DeveloperProfile = {
        ...profile,
        github: "",
        githubSync: undefined,
      };
      onUpdateProfile(updated);
    }
  };

  const handleLinkUsername = async (handleToLink?: string) => {
    const rawTarget = handleToLink !== undefined ? handleToLink : (isChanging ? changeInput : manualInput);
    const cleaned = extractGithubHandle(rawTarget);
    if (!cleaned) {
      setErrorMsg("Please enter a valid GitHub username.");
      return;
    }

    setIsLinking(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/github/contributions?username=${encodeURIComponent(cleaned)}&force=true`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Could not find GitHub user @${cleaned}`);
      }

      if (data.days && Array.isArray(data.days) && data.days.length > 0) {
        setHeatmapDays(data.days);
      }

      setStats({
        totalContributions: data.totalContributions,
        currentStreak: data.currentStreak,
        publicRepos: data.profile?.publicRepos,
        followers: data.profile?.followers,
        lastSyncedAt: data.syncedAt || "Just now",
      });

      lastFetchedUserRef.current = cleaned;

      if (profile && onUpdateProfile) {
        const isDefaultName =
          !profile.name ||
          profile.name === "Developer" ||
          profile.name === "developer" ||
          profile.name === "Arnel Rivera";
        const isDefaultAvatar =
          !profile.avatar ||
          profile.avatar.includes("unsplash") ||
          profile.avatar.includes("avatars.githubusercontent.com/u/10313");

        const updated: DeveloperProfile = {
          ...profile,
          name: isDefaultName ? (data.profile?.name || cleaned) : profile.name,
          bio: data.profile?.bio !== undefined && data.profile?.bio !== "" ? data.profile.bio : profile.bio,
          readmeMarkdown:
            data.readmeMarkdown !== undefined && data.readmeMarkdown !== ""
              ? data.readmeMarkdown
              : profile.readmeMarkdown,
          avatar: isDefaultAvatar ? (data.profile?.avatar || profile.avatar) : profile.avatar,
          company: data.profile?.company || profile.company || "",
          location: data.profile?.location || profile.location || "",
          website: data.profile?.website || profile.website || "",
          twitter: data.profile?.twitter || profile.twitter || "",
          linkedin: data.profile?.linkedin || profile.linkedin || "",
          github: `https://github.com/${cleaned}`,
          githubSync: {
            connected: true,
            username: cleaned,
            avatarUrl: data.profile?.avatar,
            profileUrl: data.profile?.profileUrl || `https://github.com/${cleaned}`,
            totalContributions: data.totalContributions,
            currentStreak: data.currentStreak,
            longestStreak: data.longestStreak,
            publicRepos: data.profile?.publicRepos,
            followers: data.profile?.followers,
            lastSyncedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        };
        onUpdateProfile(updated);
      }

      setIsChanging(false);
      setManualInput("");
      setChangeInput("");
    } catch (err: any) {
      setErrorMsg(err?.message || `Could not link @${cleaned}. Please check the username.`);
    } finally {
      setIsLinking(false);
    }
  };

  const totalContribs =
    stats.totalContributions ??
    profile?.githubSync?.totalContributions ??
    heatmapDays.reduce((acc, d) => acc + d.count, 0);
  const streak = stats.currentStreak ?? profile?.githubSync?.currentStreak ?? 0;

  // Month positions aligned with week columns (GitHub Standard)
  const monthLabelsWithPositions = useMemo(() => {
    const labels: { month: string; colIndex: number }[] = [];
    let lastMonth = "";
    const totalWeeks = Math.ceil(heatmapDays.length / 7);

    for (let w = 0; w < totalWeeks; w++) {
      const day = heatmapDays[w * 7];
      if (day) {
        const d = new Date(day.date + "T00:00:00");
        const m = d.toLocaleString("en-US", { month: "short" });
        if (m !== lastMonth) {
          labels.push({ month: m, colIndex: w });
          lastMonth = m;
        }
      }
    }

    return labels;
  }, [heatmapDays]);

  const handleCellMouseEnter = (day: ActivityDay, e: React.MouseEvent<HTMLDivElement>) => {
    if (chartRef.current) {
      const rect = chartRef.current.getBoundingClientRect();
      const cellRect = e.currentTarget.getBoundingClientRect();
      setHoveredDay({
        day,
        x: cellRect.left - rect.left + cellRect.width / 2,
        y: cellRect.top - rect.top,
      });
    }
  };

  return (
    <div className="w-full space-y-3 font-sans">
      {errorMsg && (
        <div className="p-3 rounded-md bg-[#ffebe9] dark:bg-rose-950/50 border border-[#ff8182]/40 dark:border-rose-800/40 text-[#cf222e] dark:text-rose-300 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#cf222e] dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-[#cf222e] dark:text-rose-300 hover:underline text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* GitHub Section Header: "{Count} contributions in {Year}" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-semibold text-[#1f2328] dark:text-white tracking-tight">
            {isConnected ? (
              <span>
                {formatNumber(totalContribs)} contributions in {selectedYear === "2026" ? "the last year" : selectedYear}
              </span>
            ) : (
              <span>GitHub Contribution Graph</span>
            )}
          </h3>
          {isConnected && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1a7f37] dark:text-emerald-400 bg-[#dafbe1] dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-[#4ac26b]/30 dark:border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </span>
          )}
        </div>

        {isConnected && (
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#9a6700] dark:text-amber-300 bg-[#fff8c5] dark:bg-amber-950/60 px-2.5 py-1 rounded-md border border-[#d4a72c]/40 dark:border-amber-500/30">
                <Flame className="w-3.5 h-3.5 fill-[#d4a72c] text-[#d4a72c] dark:fill-amber-400 dark:text-amber-400" />
                <span>{streak} day streak</span>
              </span>
            )}

            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#1f2328] dark:text-white bg-[#f6f8fa] dark:bg-white/5 hover:bg-[#eaeef2] dark:hover:bg-white/10 border border-[#d0d7de] dark:border-white/10 rounded-md shadow-xs transition disabled:opacity-50 cursor-pointer"
                  title="Sync latest GitHub data"
                >
                  <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin text-[#0969da] dark:text-cyan-400")} />
                  <span>{isLoading ? "Syncing..." : "Sync"}</span>
                </button>

                {/* Contribution Settings Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#656d76] dark:text-slate-400 hover:text-[#1f2328] dark:hover:text-white bg-[#f6f8fa] dark:bg-white/5 hover:bg-[#eaeef2] dark:hover:bg-white/10 border border-[#d0d7de] dark:border-white/10 rounded-md transition cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                    <span className="hidden sm:inline">Settings</span>
                  </button>

                  {showSettingsDropdown && (
                    <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-[#18181b] border border-[#d0d7de] dark:border-white/10 rounded-md shadow-lg p-2 z-30 text-xs text-[#1f2328] dark:text-slate-200 space-y-1">
                      <div className="font-semibold text-[#656d76] dark:text-slate-400 px-2 py-1 text-[11px] uppercase tracking-wider">
                        Contribution settings
                      </div>
                      <a
                        href={`https://github.com/${activeGithubUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-2 py-1.5 hover:bg-[#f6f8fa] dark:hover:bg-white/5 rounded-md text-[#0969da] dark:text-cyan-400"
                      >
                        <span>View GitHub Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSettingsDropdown(false);
                          setChangeInput(activeGithubUsername);
                          setIsChanging(true);
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-[#f6f8fa] dark:hover:bg-white/5 rounded-md flex items-center justify-between cursor-pointer"
                      >
                        <span>Change Account</span>
                        <Edit3 className="w-3 h-3 text-[#656d76] dark:text-slate-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSettingsDropdown(false);
                          handleSync();
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-[#f6f8fa] dark:hover:bg-white/5 rounded-md cursor-pointer"
                      >
                        Force Fresh Resync
                      </button>
                      <div className="border-t border-[#d0d7de] dark:border-white/10 my-1" />
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="w-full text-left px-2 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-md flex items-center justify-between cursor-pointer"
                      >
                        <span>Disconnect GitHub</span>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* GitHub Card Container */}
      <div 
        ref={chartRef}
        className="relative bg-white dark:bg-[#121215] border border-[#d0d7de] dark:border-white/10 rounded-md p-4 shadow-xs"
      >
        {!isConnected ? (
          /* Empty / Unconnected State */
          readOnly ? (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#f6f8fa] dark:bg-white/5 border border-[#d0d7de] dark:border-white/10 flex items-center justify-center text-[#1f2328] dark:text-white">
                <Github className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-[#1f2328] dark:text-white">No GitHub Activity Linked</h4>
              <p className="text-xs text-[#656d76] dark:text-slate-400 max-w-sm">
                @{profile?.username || "This developer"} has not linked a public GitHub account yet.
              </p>
            </div>
          ) : (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-[#f6f8fa] dark:bg-white/5 border border-[#d0d7de] dark:border-white/10 flex items-center justify-center text-[#1f2328] dark:text-white shadow-2xs">
                <Github className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#1f2328] dark:text-white">Connect Your GitHub</h4>
                <p className="text-xs text-[#656d76] dark:text-slate-400 max-w-md">
                  Enter your public GitHub handle to load your activity calendar, streaks, and repository contributions instantly.
                </p>
              </div>
              
              <div className="flex flex-col items-center gap-3 pt-2 w-full max-w-sm">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLinkUsername();
                  }}
                  className="flex items-center gap-2 w-full"
                >
                  <div className="relative flex-1 flex items-center">
                    <span className="absolute left-3 text-xs text-[#656d76] dark:text-slate-400 select-none">
                      github.com/
                    </span>
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="username (e.g. hiroqt)"
                      className="w-full pl-[88px] pr-3 py-1.5 text-xs bg-[#f6f8fa] dark:bg-white/5 border border-[#d0d7de] dark:border-white/10 rounded-lg text-[#1f2328] dark:text-white placeholder:text-[#656d76]/60 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0969da]/30 focus:border-[#0969da]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLinking || !manualInput.trim()}
                    className="px-3 py-1.5 bg-[#1f2328] hover:bg-[#24292f] dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isLinking ? "Linking..." : "Link"}
                  </button>
                </form>

                <div className="flex items-center gap-2 text-[11px] text-[#656d76] dark:text-slate-500">
                  <span className="h-[1px] w-8 bg-[#d0d7de] dark:bg-white/10" />
                  <span>or</span>
                  <span className="h-[1px] w-8 bg-[#d0d7de] dark:bg-white/10" />
                </div>

                <button
                  type="button"
                  onClick={handleConnectOAuth}
                  className="px-3 py-1.5 bg-transparent hover:bg-[#f6f8fa] dark:hover:bg-white/5 text-[#1f2328] dark:text-white border border-[#d0d7de] dark:border-white/10 text-xs font-medium rounded-lg flex items-center gap-2 transition cursor-pointer"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>Authorize with GitHub OAuth</span>
                </button>
              </div>
            </div>
          )
        ) : (
          /* GitHub-Accurate Heatmap Layout */
          <div className="space-y-3">
            {/* Scroll Navigation Controls */}
            <div className="flex items-center justify-between text-[11px] text-[#656d76] dark:text-slate-400 pb-1">
              <div className="flex items-center gap-2">
                {!isChanging ? (
                  <>
                    <a
                      href={`https://github.com/${activeGithubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#0969da] dark:text-cyan-400 hover:underline flex items-center gap-1 text-xs"
                    >
                      <span>@{activeGithubUsername}</span>
                      <ExternalLink className="w-3 h-3 text-[#656d76] dark:text-slate-400" />
                    </a>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setChangeInput(activeGithubUsername);
                          setIsChanging(true);
                        }}
                        className="text-[11px] text-[#656d76] hover:text-[#1f2328] dark:text-slate-400 dark:hover:text-white underline cursor-pointer ml-1"
                        title="Change GitHub username"
                      >
                        Change
                      </button>
                    )}
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleLinkUsername();
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-xs text-[#656d76] dark:text-slate-400">@</span>
                    <input
                      type="text"
                      value={changeInput}
                      onChange={(e) => setChangeInput(e.target.value)}
                      placeholder="github-username"
                      className="w-32 px-2 py-0.5 text-xs bg-[#f6f8fa] dark:bg-white/5 border border-[#d0d7de] dark:border-white/10 rounded text-[#1f2328] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0969da]"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={isLinking || !changeInput.trim()}
                      className="px-2 py-0.5 text-[11px] font-semibold bg-[#1f2328] dark:bg-white text-white dark:text-slate-900 rounded hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      {isLinking ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChanging(false)}
                      className="px-1.5 py-0.5 text-[11px] text-[#656d76] dark:text-slate-400 hover:text-[#1f2328] dark:hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                )}
                {stats.publicRepos !== undefined && stats.publicRepos > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[#656d76] dark:text-slate-400">
                    • <BookOpen className="w-3 h-3" /> {stats.publicRepos} repos
                  </span>
                )}
                {stats.followers !== undefined && stats.followers > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[#656d76] dark:text-slate-400">
                    • <Users className="w-3 h-3" /> {stats.followers} followers
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleScrollLeft}
                  className="p-1 rounded-md text-[#656d76] dark:text-slate-400 hover:text-[#1f2328] dark:hover:text-white hover:bg-[#f6f8fa] dark:hover:bg-white/5 border border-[#d0d7de] dark:border-white/10 transition cursor-pointer"
                  title="Scroll to earlier months"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleScrollRight}
                  className="p-1 rounded-md text-[#656d76] dark:text-slate-400 hover:text-[#1f2328] dark:hover:text-white hover:bg-[#f6f8fa] dark:hover:bg-white/5 border border-[#d0d7de] dark:border-white/10 transition cursor-pointer"
                  title="Scroll to later months"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={scrollToLatest}
                  className="px-2 py-0.5 text-[10px] font-medium text-[#1f2328] dark:text-white bg-[#f6f8fa] dark:bg-white/5 hover:bg-[#eaeef2] dark:hover:bg-white/10 border border-[#d0d7de] dark:border-white/10 rounded-md transition cursor-pointer"
                >
                  Latest
                </button>
              </div>
            </div>

            {/* Scrollable Contribution Calendar Grid */}
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto pb-2 pt-1 max-w-full overscroll-x-contain select-none scrollbar-thin"
            >
              <div className="inline-block min-w-max">
                {/* Month Labels aligned to 53 week columns */}
                <div className="relative h-4 text-[10px] font-normal text-[#656d76] dark:text-slate-400 mb-1 pl-8">
                  {monthLabelsWithPositions.map((item, idx) => (
                    <span
                      key={`${item.month}-${idx}`}
                      className="absolute whitespace-nowrap"
                      style={{ left: `${32 + item.colIndex * 13.5}px` }}
                    >
                      {item.month}
                    </span>
                  ))}
                </div>

                <div className="flex items-start gap-1.5">
                  {/* Weekday Labels (Mon, Wed, Fri) */}
                  <div
                    className="grid grid-flow-row text-[9px] font-normal text-[#656d76] dark:text-slate-500 select-none pr-1 sticky left-0 bg-white dark:bg-[#121215] z-10"
                    style={{ gridTemplateRows: "repeat(7, 10.5px)", rowGap: "3px" }}
                  >
                    <span className="h-[10.5px] leading-[10.5px]" />
                    <span className="h-[10.5px] leading-[10.5px]">Mon</span>
                    <span className="h-[10.5px] leading-[10.5px]" />
                    <span className="h-[10.5px] leading-[10.5px]">Wed</span>
                    <span className="h-[10.5px] leading-[10.5px]" />
                    <span className="h-[10.5px] leading-[10.5px]">Fri</span>
                    <span className="h-[10.5px] leading-[10.5px]" />
                  </div>

                  {/* 7 rows x 53 columns SVG/Grid */}
                  <div
                    className="grid grid-flow-col"
                    style={{ 
                      gridTemplateRows: "repeat(7, 10.5px)",
                      rowGap: "3px",
                      columnGap: "3px"
                    }}
                  >
                    {heatmapDays.map((day) => {
                      let bgClass = "bg-[#ebedf0] dark:bg-[#161b22] outline outline-1 outline-[#1b1f230f] dark:outline-[#30363d] -outline-offset-1";
                      if (day.level === 1) bgClass = "bg-[#9be9a8] dark:bg-[#0e4429]";
                      else if (day.level === 2) bgClass = "bg-[#40c463] dark:bg-[#006d32]";
                      else if (day.level === 3) bgClass = "bg-[#30a14e] dark:bg-[#26a641]";
                      else if (day.level === 4) bgClass = "bg-[#216e39] dark:bg-[#39d353]";

                      return (
                        <div
                          key={day.date}
                          onMouseEnter={(e) => handleCellMouseEnter(day, e)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={cn(
                            "w-[10.5px] h-[10.5px] rounded-[2px] transition-transform cursor-pointer hover:outline hover:outline-1 hover:outline-[#1f2328] dark:hover:outline-white hover:scale-125 z-0 hover:z-20",
                            bgClass
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* GitHub Floating Tooltip */}
            {hoveredDay && (
              <div
                className="absolute z-40 -translate-x-1/2 -translate-y-full pointer-events-none transition-all duration-75"
                style={{
                  left: `${hoveredDay.x}px`,
                  top: `${hoveredDay.y - 8}px`,
                }}
              >
                <div className="bg-[#1f2328] dark:bg-[#21262d] text-white px-2.5 py-1.5 rounded-md text-[11px] font-medium shadow-md whitespace-nowrap text-center border border-transparent dark:border-[#30363d]">
                  <div>{formatDayTooltip(hoveredDay.day.date, hoveredDay.day.count).label}</div>
                  <div className="text-[10px] text-[#8c959f] dark:text-slate-400">
                    {formatDayTooltip(hoveredDay.day.date, hoveredDay.day.count).dateFormatted}
                  </div>
                </div>
                {/* Tooltip Caret Arrow */}
                <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#1f2328] dark:border-t-[#21262d] mx-auto" />
              </div>
            )}

            {/* GitHub Footer & Legend */}
            <div className="pt-2 border-t border-[#d0d7de] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#656d76] dark:text-slate-400 gap-2">
              <a
                href="https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-settings-on-your-profile/why-are-my-contributions-not-showing-up-on-my-profile"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0969da] dark:text-cyan-400 hover:underline text-[11px]"
              >
                Learn how we count contributions
              </a>

              {/* GitHub 5-Tier Color Scale Legend */}
              <div className="flex items-center gap-1.5 text-[11px] text-[#656d76] dark:text-slate-400">
                <span>Less</span>
                <div className="flex items-center gap-[3px]">
                  <span className="w-[10px] h-[10px] rounded-[2px] bg-[#ebedf0] dark:bg-[#161b22] outline outline-1 outline-[#1b1f230f] dark:outline-[#30363d] -outline-offset-1" />
                  <span className="w-[10px] h-[10px] rounded-[2px] bg-[#9be9a8] dark:bg-[#0e4429]" />
                  <span className="w-[10px] h-[10px] rounded-[2px] bg-[#40c463] dark:bg-[#006d32]" />
                  <span className="w-[10px] h-[10px] rounded-[2px] bg-[#30a14e] dark:bg-[#26a641]" />
                  <span className="w-[10px] h-[10px] rounded-[2px] bg-[#216e39] dark:bg-[#39d353]" />
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
