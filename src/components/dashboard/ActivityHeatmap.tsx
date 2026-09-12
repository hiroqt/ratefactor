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
  Settings
} from "lucide-react";
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
  const [githubInput, setGithubInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
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

  // Extract GitHub username
  const rawGithub =
    profile?.githubSync?.username ||
    profile?.github ||
    (profile?.username && profile.username !== "developer" && profile.username !== "user-default"
      ? profile.username
      : "");
  const activeGithubUsername = rawGithub
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\/$/, "")
    .replace(/^@/, "")
    .trim();

  const isConnected = Boolean(
    activeGithubUsername &&
      activeGithubUsername !== "developer" &&
      activeGithubUsername !== "user-default"
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

  const handleConnectByUsername = (e: React.FormEvent) => {
    e.preventDefault();
    const target = githubInput.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//, "");
    if (!target) return;
    if (profile && onUpdateProfile) {
      const updated: DeveloperProfile = {
        ...profile,
        github: `https://github.com/${target}`,
        githubSync: {
          connected: true,
          username: target,
        },
      };
      onUpdateProfile(updated);
    }
    fetchContributions(target, true);
    setGithubInput("");
  };

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
        <div className="p-3 rounded-md bg-[#ffebe9] border border-[#ff8182]/40 text-[#cf222e] text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#cf222e] shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-[#cf222e] hover:underline text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* GitHub Section Header: "{Count} contributions in {Year}" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-semibold text-[#1f2328] tracking-tight">
            {isConnected ? (
              <span>
                {formatNumber(totalContribs)} contributions in {selectedYear === "2026" ? "the last year" : selectedYear}
              </span>
            ) : (
              <span>GitHub Contribution Graph</span>
            )}
          </h3>
          {isConnected && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1a7f37] bg-[#dafbe1] px-2 py-0.5 rounded-full border border-[#4ac26b]/30">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </span>
          )}
        </div>

        {isConnected && (
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#9a6700] bg-[#fff8c5] px-2.5 py-1 rounded-md border border-[#d4a72c]/40">
                <Flame className="w-3.5 h-3.5 fill-[#d4a72c] text-[#d4a72c]" />
                <span>{streak} day streak</span>
              </span>
            )}

            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#1f2328] bg-[#f6f8fa] hover:bg-[#eaeef2] border border-[#d0d7de] rounded-md shadow-xs transition disabled:opacity-50 cursor-pointer"
                  title="Sync latest GitHub data"
                >
                  <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin text-[#0969da]")} />
                  <span>{isLoading ? "Syncing..." : "Sync"}</span>
                </button>

                {/* Contribution Settings Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#656d76] hover:text-[#1f2328] bg-[#f6f8fa] hover:bg-[#eaeef2] border border-[#d0d7de] rounded-md transition cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                    <span className="hidden sm:inline">Settings</span>
                  </button>

                  {showSettingsDropdown && (
                    <div className="absolute right-0 mt-1 w-56 bg-white border border-[#d0d7de] rounded-md shadow-lg p-2 z-30 text-xs text-[#1f2328] space-y-1">
                      <div className="font-semibold text-[#656d76] px-2 py-1 text-[11px] uppercase tracking-wider">
                        Contribution settings
                      </div>
                      <a
                        href={`https://github.com/${activeGithubUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-2 py-1.5 hover:bg-[#f6f8fa] rounded-md text-[#0969da]"
                      >
                        <span>View GitHub Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => {
                          setShowSettingsDropdown(false);
                          handleSync();
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-[#f6f8fa] rounded-md"
                      >
                        Force Fresh Resync
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
        className="relative bg-white border border-[#d0d7de] rounded-md p-4 shadow-xs"
      >
        {!isConnected ? (
          /* Empty / Unconnected State */
          readOnly ? (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#f6f8fa] border border-[#d0d7de] flex items-center justify-center text-[#1f2328]">
                <Github className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-[#1f2328]">No GitHub Activity Linked</h4>
              <p className="text-xs text-[#656d76] max-w-sm">
                @{profile?.username || "This developer"} has not linked a public GitHub account yet.
              </p>
            </div>
          ) : (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#f6f8fa] border border-[#d0d7de] flex items-center justify-center text-[#1f2328]">
                <Github className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#1f2328]">Display GitHub Contributions</h4>
                <p className="text-xs text-[#656d76] max-w-sm mt-0.5">
                  Sign in with GitHub or enter your username to render your live activity calendar.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConnectOAuth}
                  className="px-3.5 py-1.5 bg-[#1f2328] hover:bg-[#24292f] text-white text-xs font-semibold rounded-md flex items-center gap-2 transition cursor-pointer"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>Sign in with GitHub</span>
                </button>

                <span className="text-xs text-[#656d76]">or</span>

                <form onSubmit={handleConnectByUsername} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={githubInput}
                    onChange={(e) => setGithubInput(e.target.value)}
                    placeholder="GitHub username"
                    className="px-2.5 py-1.5 bg-white border border-[#d0d7de] rounded-md text-xs text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent w-36"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !githubInput.trim()}
                    className="px-3 py-1.5 bg-[#1f883d] hover:bg-[#1a7f37] text-white text-xs font-semibold rounded-md transition disabled:opacity-50 cursor-pointer"
                  >
                    Connect
                  </button>
                </form>
              </div>
            </div>
          )
        ) : (
          /* GitHub-Accurate Heatmap Layout */
          <div className="space-y-3">
            {/* Scroll Navigation Controls */}
            <div className="flex items-center justify-between text-[11px] text-[#656d76] pb-1">
              <div className="flex items-center gap-2">
                <a
                  href={`https://github.com/${activeGithubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#0969da] hover:underline flex items-center gap-1 text-xs"
                >
                  <span>@{activeGithubUsername}</span>
                  <ExternalLink className="w-3 h-3 text-[#656d76]" />
                </a>
                {stats.publicRepos !== undefined && stats.publicRepos > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[#656d76]">
                    • <BookOpen className="w-3 h-3" /> {stats.publicRepos} repos
                  </span>
                )}
                {stats.followers !== undefined && stats.followers > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[#656d76]">
                    • <Users className="w-3 h-3" /> {stats.followers} followers
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleScrollLeft}
                  className="p-1 rounded-md text-[#656d76] hover:text-[#1f2328] hover:bg-[#f6f8fa] border border-[#d0d7de] transition cursor-pointer"
                  title="Scroll to earlier months"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleScrollRight}
                  className="p-1 rounded-md text-[#656d76] hover:text-[#1f2328] hover:bg-[#f6f8fa] border border-[#d0d7de] transition cursor-pointer"
                  title="Scroll to later months"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={scrollToLatest}
                  className="px-2 py-0.5 text-[10px] font-medium text-[#1f2328] bg-[#f6f8fa] hover:bg-[#eaeef2] border border-[#d0d7de] rounded-md transition cursor-pointer"
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
                <div className="relative h-4 text-[10px] font-normal text-[#656d76] mb-1 pl-8">
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
                    className="grid grid-flow-row text-[9px] font-normal text-[#656d76] select-none pr-1 sticky left-0 bg-white z-10"
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
                      let bgClass = "bg-[#ebedf0] outline outline-1 outline-[#1b1f230f] -outline-offset-1";
                      if (day.level === 1) bgClass = "bg-[#9be9a8]";
                      else if (day.level === 2) bgClass = "bg-[#40c463]";
                      else if (day.level === 3) bgClass = "bg-[#30a14e]";
                      else if (day.level === 4) bgClass = "bg-[#216e39]";

                      return (
                        <div
                          key={day.date}
                          onMouseEnter={(e) => handleCellMouseEnter(day, e)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={cn(
                            "w-[10.5px] h-[10.5px] rounded-[2px] transition-transform cursor-pointer hover:outline hover:outline-1 hover:outline-[#1f2328] hover:scale-125 z-0 hover:z-20",
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
                <div className="bg-[#1f2328] text-white px-2.5 py-1.5 rounded-md text-[11px] font-medium shadow-md whitespace-nowrap text-center">
                  <div>{formatDayTooltip(hoveredDay.day.date, hoveredDay.day.count).label}</div>
                  <div className="text-[10px] text-[#8c959f]">
                    {formatDayTooltip(hoveredDay.day.date, hoveredDay.day.count).dateFormatted}
                  </div>
                </div>
                {/* Tooltip Caret Arrow */}
                <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#1f2328] mx-auto" />
              </div>
            )}

            {/* GitHub Footer & Legend */}
            <div className="pt-2 border-t border-[#d0d7de] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#656d76] gap-2">
              <a
                href="https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-settings-on-your-profile/why-are-my-contributions-not-showing-up-on-my-profile"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0969da] hover:underline text-[11px]"
              >
                Learn how we count contributions
              </a>

              {/* GitHub 5-Tier Color Scale Legend */}
              <div className="flex items-center gap-1.5 text-[11px] text-[#656d76]">
                <span>Less</span>
                <div className="flex items-center gap-[3px]">
                  <span className="w-[10px] h-[10px] rounded-[2px] bg-[#ebedf0] outline outline-1 outline-[#1b1f230f] -outline-offset-1" />
                  <span className="w-[10px] h-[10px] rounded-[2px] bg-[#9be9a8]" />
                  <span className="w-[10px] h-[10px] rounded-[2px] bg-[#40c463]" />
                  <span className="w-[10px] h-[10px] rounded-[2px] bg-[#30a14e]" />
                  <span className="w-[10px] h-[10px] rounded-[2px] bg-[#216e39]" />
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
