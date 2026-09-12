"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Lock
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
}

function generateEmptyHeatmap(): ActivityDay[] {
  const days: ActivityDay[] = [];
  const today = new Date();
  for (let i = 139; i >= 0; i--) {
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

function getHeatmapMonths(days: ActivityDay[]): string[] {
  if (days.length === 0) return ["May", "Jun", "Jul", "Aug", "Sep"];
  const months: string[] = [];
  const step = Math.floor(days.length / 5);
  for (let i = 0; i < days.length; i += step) {
    const d = new Date(days[i].date);
    const m = d.toLocaleString("default", { month: "short" });
    if (!months.includes(m)) {
      months.push(m);
    }
  }
  return months.slice(0, 5);
}

export function ActivityHeatmap({
  profile,
  onUpdateProfile,
  onRequireAuth,
}: ActivityHeatmapProps) {
  const [heatmapDays, setHeatmapDays] = useState<ActivityDay[]>(generateEmptyHeatmap());
  const [hoveredDay, setHoveredDay] = useState<ActivityDay | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [githubInput, setGithubInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalContributions?: number;
    currentStreak?: number;
    publicRepos?: number;
    followers?: number;
    lastSyncedAt?: string;
  }>({});

  // Extract GitHub username from profile.githubSync, profile.github, or profile.username
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

  const fetchContributions = useCallback(
    async (usernameToFetch: string) => {
      if (!usernameToFetch || usernameToFetch === "developer" || usernameToFetch === "user-default") return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(
          `/api/github/contributions?username=${encodeURIComponent(usernameToFetch)}`
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
    if (isConnected) {
      fetchContributions(activeGithubUsername);
    }
  }, [activeGithubUsername, isConnected]);

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
    fetchContributions(target);
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
  const monthLabels = getHeatmapMonths(heatmapDays);

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 w-full min-w-0 max-w-full overflow-hidden">
      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-800 text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>
                {isConnected ? "GitHub Contributions & Activity" : "GitHub Contribution Graph"}
              </span>
              {isConnected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            </h4>
            <p className="text-[11px] text-slate-500">
              {isConnected
                ? `Live verified contribution graph from @${activeGithubUsername}`
                : "Connect your GitHub account or specify handle to embed your live contributions."}
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-2 text-[11px] font-mono">
            {streak > 0 && (
              <span className="flex items-center gap-1 text-slate-700 font-semibold px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{streak}-day streak</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleSync}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer border border-slate-200"
              title="Sync latest GitHub data"
            >
              <RefreshCw
                className={cn("w-3 h-3", isLoading && "animate-spin text-emerald-600")}
              />
              <span>{isLoading ? "Syncing..." : "Sync GitHub"}</span>
            </button>
          </div>
        )}
      </div>

      {/* CENTER PIECE: If NOT Connected -> Prominent Center Connect Box */}
      {!isConnected ? (
        <div className="relative rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 sm:p-8 flex flex-col items-center justify-center text-center my-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md mb-3">
            <Github className="w-6 h-6" />
          </div>
          <h5 className="text-sm font-bold text-slate-900">Embed Your GitHub Contributions</h5>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-5">
            Link your GitHub username to embed your live activity chart directly into your RateFactor showcase.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
            <button
              type="button"
              onClick={handleConnectOAuth}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Github className="w-4 h-4" />
              <span>Sign In with GitHub</span>
            </button>

            <span className="text-xs text-slate-400 font-mono">or</span>

            <form onSubmit={handleConnectByUsername} className="flex items-center gap-1.5 w-full sm:w-auto">
              <input
                type="text"
                value={githubInput}
                onChange={(e) => setGithubInput(e.target.value)}
                placeholder="Enter GitHub handle..."
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 flex-1 sm:w-44 transition shadow-xs"
              />
              <button
                type="submit"
                disabled={isLoading || !githubInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs shrink-0"
              >
                Embed
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Connected State: Metadata Bar + Native SVG Heatmap Grid */
        <div className="space-y-3">
          {/* Metadata bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-slate-900 shrink-0" />
              <a
                href={`https://github.com/${activeGithubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-slate-900 hover:underline flex items-center gap-1"
              >
                <span>@{activeGithubUsername}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
              {totalContribs !== undefined && (
                <span className="font-semibold text-slate-800">
                  {formatNumber(totalContribs)} contributions in 2026
                </span>
              )}
              {stats.publicRepos !== undefined && stats.publicRepos > 0 && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-slate-400" />
                  {stats.publicRepos} repos
                </span>
              )}
              {stats.followers !== undefined && stats.followers > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  {stats.followers} followers
                </span>
              )}
            </div>
          </div>

          {/* Native SVG Contribution Heatmap Grid */}
          <div className="overflow-x-auto pb-1 max-w-full overscroll-x-contain">
            <div className="min-w-[620px]">
              {/* Months header aligned with weeks */}
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1.5 pl-7 pr-2">
                {monthLabels.map((m, idx) => (
                  <span key={`${m}-${idx}`}>{m}</span>
                ))}
              </div>

              <div className="flex items-start gap-1.5">
                {/* Weekday labels (Mon / Wed / Fri) */}
                <div
                  className="grid grid-flow-row gap-1 text-[9px] font-mono text-slate-400 select-none pr-1 pt-0.5"
                  style={{ gridTemplateRows: "repeat(7, 12px)" }}
                >
                  <span className="h-3 leading-3" />
                  <span className="h-3 leading-3">Mon</span>
                  <span className="h-3 leading-3" />
                  <span className="h-3 leading-3">Wed</span>
                  <span className="h-3 leading-3" />
                  <span className="h-3 leading-3">Fri</span>
                  <span className="h-3 leading-3" />
                </div>

                {/* 7 rows for days of week, 20 columns for weeks */}
                <div
                  className="grid grid-flow-col gap-1 flex-1"
                  style={{ gridTemplateRows: "repeat(7, 12px)" }}
                >
                  {heatmapDays.map((day) => {
                    let colorClass = "bg-[#ebedf0]";
                    if (day.level === 1) colorClass = "bg-[#9be9a8]";
                    else if (day.level === 2) colorClass = "bg-[#40c463]";
                    else if (day.level === 3) colorClass = "bg-[#30a14e]";
                    else if (day.level === 4) colorClass = "bg-[#216e39]";

                    return (
                      <div
                        key={day.date}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={cn(
                          "w-3 h-3 rounded-[2px] transition-all cursor-pointer hover:ring-1 hover:ring-slate-900/40",
                          colorClass
                        )}
                        title={`${day.count} contributions on ${day.date}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="h-4">
          {isConnected && hoveredDay ? (
            <span className="text-slate-900 font-mono">
              <strong>{hoveredDay.count}</strong> contribution{hoveredDay.count === 1 ? "" : "s"} on{" "}
              {hoveredDay.date}
            </span>
          ) : isConnected ? (
            <span className="text-slate-400">Hover over any square for activity details</span>
          ) : (
            <span className="text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Connect GitHub to embed live activity
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 font-mono text-[10px]">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#ebedf0] border border-slate-200" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#9be9a8]" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#40c463]" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#30a14e]" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#216e39]" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
