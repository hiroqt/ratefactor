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
  Trash2
} from "@/components/ui/icons";
import { cn, formatNumber } from "@/lib/utils";
import { DeveloperProfile } from "@/types/profile";
import { AuthUser } from "@/features/auth/hooks/useAuth";
import { useGithubConnection } from "@/features/dashboard/hooks/useGithubConnection";

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
  /** Required (for !readOnly) to resolve authoritative GitHub link status via Better Auth. */
  currentUser?: AuthUser | null;
  /**
   * Optional: a useGithubConnection() instance already created by a parent
   * (e.g. the owner's profile page, which also needs it for a summary
   * tile). When supplied, this component reuses it instead of running a
   * second authoritative listAccounts/sync flow for the same signed-in
   * user. When omitted, it falls back to instantiating its own.
   */
  connection?: ReturnType<typeof useGithubConnection>;
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
  currentUser,
  connection,
}: ActivityHeatmapProps) {
  // ─────────────────────────────────────────────────────────────────────
  // Read-only mode (viewing someone else's public profile): there is no
  // session to check, so this keeps displaying whatever GitHub data that
  // OTHER developer has already synced/persisted, via the profile prop.
  // ─────────────────────────────────────────────────────────────────────
  const [publicHeatmapDays, setPublicHeatmapDays] = useState<ActivityDay[]>(generateEmptyHeatmap());
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);
  const [publicErrorMsg, setPublicErrorMsg] = useState<string | null>(null);
  const [publicStats, setPublicStats] = useState<{
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
  const publicGithubUsername = explicitGithub || syncGithub || "";

  const isPublicConnected = Boolean(
    publicGithubUsername &&
      publicGithubUsername !== "developer" &&
      publicGithubUsername !== "user-default" &&
      (profile?.githubSync?.connected || Boolean(profile?.github))
  );

  // ─────────────────────────────────────────────────────────────────────
  // Interactive mode (own dashboard): GitHub connection truth comes
  // exclusively from Better Auth's linked-account state, never from the
  // profile prop / localStorage / a manually typed username.
  //
  // When a parent already instantiated useGithubConnection and passed it in
  // via `connection`, this internal call is starved of a user identity so
  // it performs no listAccounts/sync network work of its own — it would
  // otherwise duplicate the parent's authoritative check for the same user.
  // (The hook is still called unconditionally, per the rules of hooks.)
  const internalGithub = useGithubConnection(readOnly || connection ? null : currentUser);
  const github = connection || internalGithub;

  const isConnected = readOnly ? isPublicConnected : github.status === "connected";
  // "Verified" specifically claims a real OAuth-linked GitHub account, which
  // a bare profile.github display URL never proves on its own — only
  // genuine persisted sync metadata does. isConnected (above) still gates
  // whether the activity graph itself renders for a bio-linked username, so
  // public GitHub bio links keep working either way.
  const isVerified = readOnly ? Boolean(profile?.githubSync?.connected) : isConnected;
  const activeGithubUsername = readOnly ? publicGithubUsername : (github.data?.username || "");
  const heatmapDays =
    readOnly
      ? publicHeatmapDays
      : github.data?.days && github.data.days.length > 0
        ? github.data.days
        : generateEmptyHeatmap();
  const isLoading = readOnly ? isLoadingPublic : github.status === "loading" || github.isSyncing;
  const stats = readOnly
    ? publicStats
    : {
        totalContributions: github.data?.totalContributions,
        currentStreak: github.data?.currentStreak,
        publicRepos: github.data?.publicRepos,
        followers: github.data?.followers,
        lastSyncedAt: github.data?.lastSyncedAt,
      };

  const [hoveredDay, setHoveredDay] = useState<{ day: ActivityDay; x: number; y: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

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

  // Public/read-only fetch by username only — never used for the interactive
  // "own dashboard" path, which is driven entirely by useGithubConnection.
  const fetchContributions = useCallback(
    async (usernameToFetch: string, force = false) => {
      if (!usernameToFetch || usernameToFetch === "developer" || usernameToFetch === "user-default") return;
      if (!force && lastFetchedUserRef.current === usernameToFetch) return;
      lastFetchedUserRef.current = usernameToFetch;

      setIsLoadingPublic(true);
      setPublicErrorMsg(null);
      try {
        const res = await fetch(
          `/api/github/contributions?username=${encodeURIComponent(usernameToFetch)}${force ? "&force=true" : ""}`
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch GitHub contributions");
        }

        if (data.days && Array.isArray(data.days) && data.days.length > 0) {
          setPublicHeatmapDays(data.days);
        }

        setPublicStats({
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
            github: profile.github || (profile.githubSync?.connected ? `https://github.com/${usernameToFetch}` : ""),
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
              lastSyncedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            },
          };
          onUpdateProfile(updated);
        }
      } catch (err: any) {
        setPublicErrorMsg(err?.message || "Could not load GitHub contributions.");
      } finally {
        setIsLoadingPublic(false);
      }
    },
    [profile, onUpdateProfile]
  );

  // Public/read-only auto-fetch by username, for genuinely viewing someone
  // else's profile (or a logged-out guest's own default placeholder).
  useEffect(() => {
    if (readOnly && isPublicConnected && lastFetchedUserRef.current !== publicGithubUsername) {
      fetchContributions(publicGithubUsername);
    }
  }, [readOnly, publicGithubUsername, isPublicConnected, fetchContributions]);

  // Keep the display profile's GitHub cache fields in sync once the
  // authoritative hook confirms a genuine connection — display/cache only,
  // never the source of connection truth.
  useEffect(() => {
    if (readOnly || !profile || !onUpdateProfile || github.status !== "connected" || !github.data) return;
    const d = github.data;
    if (profile.githubSync?.username === d.username && profile.githubSync?.lastSyncedAt === d.lastSyncedAt) return;
    onUpdateProfile({
      ...profile,
      bio: d.bio || profile.bio,
      company: d.company || profile.company || "",
      location: d.location || profile.location || "",
      website: d.website || profile.website || "",
      twitter: d.twitter || profile.twitter || "",
      linkedin: d.linkedin || profile.linkedin || "",
      github: d.profileUrl || profile.github || `https://github.com/${d.username}`,
      githubSync: {
        connected: true,
        username: d.username,
        avatarUrl: d.avatarUrl,
        profileUrl: d.profileUrl || `https://github.com/${d.username}`,
        totalContributions: d.totalContributions,
        currentStreak: d.currentStreak,
        longestStreak: d.longestStreak,
        publicRepos: d.publicRepos,
        followers: d.followers,
        lastSyncedAt: d.lastSyncedAt,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, github.status, github.data, profile, onUpdateProfile]);

  useEffect(() => {
    scrollToLatest();
    const t = setTimeout(scrollToLatest, 150);
    return () => clearTimeout(t);
  }, [heatmapDays, scrollToLatest]);

  const handleConnectOAuth = async () => {
    try {
      await github.connect();
    } catch (err: any) {
      if (onRequireAuth) {
        onRequireAuth("Sign in to link your GitHub account.");
      }
    }
  };

  const handleSync = () => {
    github.sync();
  };

  const handleDisconnect = async () => {
    setShowSettingsDropdown(false);
    setDisconnectError(null);
    const result = await github.disconnect();
    if (!result.ok) {
      setDisconnectError(result.error || "Could not disconnect GitHub.");
    }
  };

  const totalContribs = stats.totalContributions ?? heatmapDays.reduce((acc, d) => acc + d.count, 0);
  const streak = stats.currentStreak ?? 0;

  // Total week columns in the grid — shared by the day grid, the month-label
  // grid, and the label-overlap filter below so all three stay in lockstep.
  const totalWeeks = useMemo(
    () => (heatmapDays && heatmapDays.length > 0 ? Math.ceil(heatmapDays.length / 7) : 0),
    [heatmapDays]
  );

  // Month positions aligned with week columns (GitHub Standard)
  const monthLabelsWithPositions = useMemo(() => {
    if (!heatmapDays || heatmapDays.length === 0 || totalWeeks === 0) return [];

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const rawLabels: { month: string; colIndex: number }[] = [];
    let lastMonth = "";

    for (let w = 0; w < totalWeeks; w++) {
      const weekDays = heatmapDays.slice(w * 7, (w + 1) * 7);
      if (weekDays.length === 0) continue;

      // Find if the 1st of a month falls in this week
      const firstOfMonth = weekDays.find((d) => {
        const parts = d.date.split("-");
        return parts.length === 3 && parseInt(parts[2], 10) === 1;
      });

      let monthForWeek = "";
      if (firstOfMonth) {
        const parts = firstOfMonth.date.split("-");
        const monthIdx = parseInt(parts[1], 10) - 1;
        monthForWeek = monthNames[monthIdx] || "";
      } else if (w === 0) {
        const parts = weekDays[0].date.split("-");
        const monthIdx = parseInt(parts[1], 10) - 1;
        monthForWeek = monthNames[monthIdx] || "";
      } else {
        const parts = weekDays[0].date.split("-");
        const monthIdx = parseInt(parts[1], 10) - 1;
        const currentWeekMonth = monthNames[monthIdx] || "";
        if (currentWeekMonth !== lastMonth) {
          monthForWeek = currentWeekMonth;
        }
      }

      if (monthForWeek && monthForWeek !== lastMonth) {
        rawLabels.push({ month: monthForWeek, colIndex: w });
        lastMonth = monthForWeek;
      }
    }

    // Filter out overlapping labels (must have at least 2 columns / ~27px between labels)
    const labels: { month: string; colIndex: number }[] = [];
    for (let i = 0; i < rawLabels.length; i++) {
      const current = rawLabels[i];
      const next = rawLabels[i + 1];

      // If first label is too close to the second label (less than 3 weeks), skip the partial initial month
      if (i === 0 && next && next.colIndex - current.colIndex < 3) {
        continue;
      }

      // Ensure minimum 2 columns gap between consecutive labels
      if (labels.length > 0) {
        const prev = labels[labels.length - 1];
        if (current.colIndex - prev.colIndex < 2) {
          continue;
        }
      }

      labels.push(current);
    }

    return labels;
  }, [heatmapDays, totalWeeks]);

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
    // container-type here lets the header row and the graph below react to the
    // ACTUAL contribution card width (via `@[…]:` container-query variants)
    // instead of viewport width, since the card can be much narrower than the
    // viewport when a dashboard sidebar is present.
    <div className="w-full space-y-3 font-sans [container-type:inline-size]">
      {readOnly && publicErrorMsg && (
        <div className="p-3 rounded-md bg-[#ffebe9] dark:bg-rose-950/50 border border-[#ff8182]/40 dark:border-rose-800/40 text-[#cf222e] dark:text-rose-300 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#cf222e] dark:text-rose-400 shrink-0" />
            <span>{publicErrorMsg}</span>
          </div>
          <button
            onClick={() => setPublicErrorMsg(null)}
            className="text-[#cf222e] dark:text-rose-300 hover:underline text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {disconnectError && (
        <div className="p-3 rounded-md bg-[#ffebe9] dark:bg-rose-950/50 border border-[#ff8182]/40 dark:border-rose-800/40 text-[#cf222e] dark:text-rose-300 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#cf222e] dark:text-rose-400 shrink-0" />
            <span>{disconnectError}</span>
          </div>
          <button
            onClick={() => setDisconnectError(null)}
            className="text-[#cf222e] dark:text-rose-300 hover:underline text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {!readOnly && isConnected && github.syncError && (
        <div className="p-3 rounded-md bg-[#fff8c5] dark:bg-amber-950/40 border border-[#d4a72c]/40 dark:border-amber-500/30 text-[#7d4e00] dark:text-amber-300 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{github.syncError}</span>
          </div>
          <button
            onClick={handleSync}
            className="hover:underline text-[11px] cursor-pointer font-semibold shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* GitHub Section Header: "{Count} contributions in {Year}" — stacks on
          narrow cards (e.g. a viewport-wide but sidebar-narrowed dashboard
          column) and goes to one row once the card has ~740px, the same
          threshold the calendar below uses to switch modes. */}
      <div className="flex flex-col @[740px]:flex-row @[740px]:items-center justify-between gap-3 pb-1">
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
          {isVerified && (
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
                    <span className="hidden @[740px]:inline">Settings</span>
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
                          handleSync();
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-[#f6f8fa] dark:hover:bg-white/5 rounded-md cursor-pointer"
                      >
                        Force Fresh Resync
                      </button>
                      <div className="border-t border-[#d0d7de] dark:border-white/10 my-1" />
                      {github.canDisconnect ? (
                        <button
                          type="button"
                          onClick={handleDisconnect}
                          className="w-full text-left px-2 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-md flex items-center justify-between cursor-pointer"
                        >
                          <span>Disconnect GitHub</span>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      ) : (
                        <div
                          className="px-2 py-1.5 text-[#656d76] dark:text-slate-500 rounded-md"
                          title="GitHub is your only sign-in method — link another account before disconnecting it."
                        >
                          Disconnect unavailable (only sign-in method)
                        </div>
                      )}
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
        className="relative bg-white dark:bg-[#121215] border border-[#d0d7de] dark:border-white/10 rounded-md p-4 shadow-xs [container-type:inline-size]"
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
                <h4 className="text-sm font-bold text-[#1f2328] dark:text-white">Connect your GitHub</h4>
                <p className="text-xs text-[#656d76] dark:text-slate-400 max-w-md">
                  Link GitHub to show your contribution activity, repositories, and profile.
                </p>
              </div>

              <button
                type="button"
                onClick={handleConnectOAuth}
                className="px-3.5 py-1.5 bg-[#1f2328] hover:bg-[#24292f] dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer"
              >
                <Github className="w-3.5 h-3.5" />
                <span>Connect GitHub</span>
              </button>
            </div>
          )
        ) : (
          /* GitHub-Accurate Heatmap Layout */
          <div className="space-y-3">
            {/* Scroll Navigation Controls */}
            <div className="flex items-center justify-between text-[11px] text-[#656d76] dark:text-slate-400 pb-1">
              <div className="flex items-center gap-2">
                <a
                  href={`https://github.com/${activeGithubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#0969da] dark:text-cyan-400 hover:underline flex items-center gap-1 text-xs"
                >
                  <span>@{activeGithubUsername}</span>
                  <ExternalLink className="w-3 h-3 text-[#656d76] dark:text-slate-400" />
                </a>
                {stats.publicRepos !== undefined && stats.publicRepos > 0 && (
                  <span className="hidden @[740px]:inline-flex items-center gap-1 text-[#656d76] dark:text-slate-400">
                    • <BookOpen className="w-3 h-3" /> {stats.publicRepos} repos
                  </span>
                )}
                {stats.followers !== undefined && stats.followers > 0 && (
                  <span className="hidden @[740px]:inline-flex items-center gap-1 text-[#656d76] dark:text-slate-400">
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

            {/* Contribution Calendar Grid — fluid on a wide card (all weeks
                fit, no scroll), but below the card's own 740px container-query
                breakpoint the week columns get a readable minimum width via
                --rf-cellmin and this becomes the horizontal scroll boundary
                instead of squeezing cells further. 740px = the content width
                53 columns need at the 10.5px readable minimum: 53*10.5 (cells)
                + 52*3 (max gap) + 28 (weekday gutter) ≈ 740px — below that,
                fluid sizing would want cells smaller than readable, so scroll
                mode kicks in instead. Uses a container query (not `sm:`
                viewport) since the card can be far narrower than the viewport
                when a dashboard sidebar is present. Month labels + cells share
                this one scroller so they always move together; weekday labels
                stay pinned via sticky. */}
            <div
              ref={scrollContainerRef}
              className="w-full pb-2 pt-1 select-none overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [--rf-cellmin:10.5px] @[740px]:[--rf-cellmin:0px]"
              style={{
                ["--rf-gap" as string]: "clamp(1px, 0.6cqw, 3px)",
              }}
            >
              <div className="w-full">
                {/* Month Labels — same N-column grid as the day grid below,
                    so each label sits over its actual week column at any width. */}
                <div className="flex items-center mb-1">
                  <div className="w-3 @[740px]:w-[28px] shrink-0 sticky left-0 z-10 bg-white dark:bg-[#121215]" />
                  <div
                    className="grid flex-1 h-4"
                    style={{ gridTemplateColumns: `repeat(${Math.max(totalWeeks, 1)}, minmax(var(--rf-cellmin), 1fr))` }}
                  >
                    {monthLabelsWithPositions.map((item, idx) => (
                      <span
                        key={`${item.month}-${item.colIndex}-${idx}`}
                        className="text-[10px] font-normal text-[#656d76] dark:text-slate-400 whitespace-nowrap leading-none self-start justify-self-start row-start-1"
                        style={{ gridColumnStart: item.colIndex + 1 }}
                      >
                        {item.month}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-stretch">
                  {/* Weekday Labels (Mon, Wed, Fri) — pinned to the left edge
                      while the calendar scrolls beneath on narrow cards; text
                      hides below the 740px container breakpoint so the gutter
                      doesn't eat into the narrow-card grid width. */}
                  <div
                    className="w-3 @[740px]:w-[28px] shrink-0 sticky left-0 z-10 bg-white dark:bg-[#121215] grid text-[9px] font-normal text-[#656d76] dark:text-slate-500 select-none pr-1.5 text-right"
                    style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))", rowGap: "var(--rf-gap)" }}
                  >
                    <span className="h-full" />
                    <span className="hidden @[740px]:flex h-full items-center justify-end">Mon</span>
                    <span className="h-full" />
                    <span className="hidden @[740px]:flex h-full items-center justify-end">Wed</span>
                    <span className="h-full" />
                    <span className="hidden @[740px]:flex h-full items-center justify-end">Fri</span>
                    <span className="h-full" />
                  </div>

                  {/* 7 rows x N week columns — fluid width once the card is wide
                      enough, readable minimum width (scrollable) below that
                      container breakpoint; square cells either way */}
                  <div
                    className="grid grid-flow-col flex-1 min-w-0"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(totalWeeks, 1)}, minmax(var(--rf-cellmin), 1fr))`,
                      gridTemplateRows: "repeat(7, auto)",
                      rowGap: "var(--rf-gap)",
                      columnGap: "var(--rf-gap)"
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
                            "w-full aspect-square rounded-[2px] transition-transform cursor-pointer hover:outline hover:outline-1 hover:outline-[#1f2328] dark:hover:outline-white hover:scale-125 z-0 hover:z-20",
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
