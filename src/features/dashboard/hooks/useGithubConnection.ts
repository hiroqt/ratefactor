"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { authClient } from "@/lib/auth/client";
import { AuthUser } from "@/features/auth/hooks/useAuth";

export interface GithubConnectionData {
  username: string;
  avatarUrl?: string;
  profileUrl?: string;
  totalContributions?: number;
  currentStreak?: number;
  longestStreak?: number;
  publicRepos?: number;
  followers?: number;
  lastSyncedAt?: string;
  days?: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[];
  bio?: string;
  company?: string;
  location?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
}

export type GithubConnectionStatus = "loading" | "connected" | "disconnected";

/**
 * Authoritative GitHub connection state for the CURRENT authenticated
 * RateFactor session. Whether GitHub is "connected" is decided exclusively
 * by Better Auth's own linked-account list (providerId === "github") — never
 * by localStorage, developerProfile.github(Sync), or a manually typed
 * username. Those remain display/cache values only, populated here once the
 * authoritative check has actually confirmed a real linked account.
 */
// Shared in-memory cache across route transitions
const memoryGithubCache: Record<string, GithubConnectionData> = {};

function getLocalGithubData(userId?: string | null): GithubConnectionData | null {
  if (!userId || typeof window === "undefined") return null;
  if (memoryGithubCache[userId]) return memoryGithubCache[userId];
  try {
    const raw = localStorage.getItem(`ratefactor_github_data_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.username) {
        memoryGithubCache[userId] = parsed;
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function useGithubConnection(currentUser?: AuthUser | null) {
  const [data, setData] = useState<GithubConnectionData | null>(() => getLocalGithubData(currentUser?.id));
  const [status, setStatus] = useState<GithubConnectionStatus>(() => {
    if (!currentUser) return "disconnected";
    const cached = getLocalGithubData(currentUser.id);
    if (cached) return "connected";
    return "loading";
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [otherLinkedAccountsCount, setOtherLinkedAccountsCount] = useState(0);
  const generationRef = useRef(0);

  const loadFresh = useCallback(async (force: boolean) => {
    const generation = generationRef.current;
    if (force) {
      setIsSyncing(true);
    }
    setSyncError(null);
    try {
      const res = await fetch(`/api/github/sync${force ? "?force=true" : ""}`, {
        method: force ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        ...(force ? { body: JSON.stringify({ force: true }) } : {}),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || "Could not refresh GitHub data.");
      }
      if (generation !== generationRef.current) return;
      const nextData: GithubConnectionData = {
        username: json.username,
        avatarUrl: json.profile?.avatarUrl,
        profileUrl: json.profile?.profileUrl,
        totalContributions: json.contributions?.totalContributions,
        currentStreak: json.contributions?.currentStreak,
        longestStreak: json.contributions?.longestStreak,
        publicRepos: json.profile?.publicRepositoryCount,
        followers: json.profile?.followers,
        lastSyncedAt: json.syncedAt,
        days: json.contributions?.days,
        bio: json.profile?.bio,
        company: json.profile?.company,
        location: json.profile?.location,
        website: json.profile?.website,
        twitter: json.profile?.twitter,
        linkedin: json.profile?.linkedin,
      };
      setData(nextData);
      setStatus("connected");
      if (currentUser?.id) {
        memoryGithubCache[currentUser.id] = nextData;
        try {
          localStorage.setItem(`ratefactor_github_data_${currentUser.id}`, JSON.stringify(nextData));
        } catch {}
      }
      if (json.persisted === false && json.error) {
        setSyncError(json.error);
      }
    } catch (err: any) {
      if (generation !== generationRef.current) return;
      setSyncError("Couldn't refresh GitHub right now. Showing previously synced data.");
    } finally {
      if (generation === generationRef.current) setIsSyncing(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const generation = ++generationRef.current;

    if (!currentUser) {
      setStatus("disconnected");
      setData(null);
      setAccountId(null);
      setOtherLinkedAccountsCount(0);
      return;
    }

    const cached = getLocalGithubData(currentUser.id);
    if (cached) {
      setData(cached);
      setStatus("connected");
    } else {
      setStatus("loading");
    }
    setSyncError(null);

    (async () => {
      try {
        const result = await authClient.listAccounts();
        if (generation !== generationRef.current) return;
        if (result.error) throw new Error(result.error.message || "Could not list linked accounts.");
        const accounts = result.data || [];
        const githubAccount = accounts.find((a) => a?.providerId === "github");

        if (!githubAccount) {
          setStatus("disconnected");
          setData(null);
          setAccountId(null);
          setOtherLinkedAccountsCount(accounts.length);
          if (currentUser.id) {
            delete memoryGithubCache[currentUser.id];
            try {
              localStorage.removeItem(`ratefactor_github_data_${currentUser.id}`);
            } catch {}
          }
          return;
        }

        setAccountId(githubAccount.id || null);
        setOtherLinkedAccountsCount(accounts.length - 1);
        setStatus("connected");
        await loadFresh(false);
      } catch {
        if (generation === generationRef.current) {
          // If we have cached data, keep it connected rather than flipping to disconnected on transient auth error
          if (!cached) {
            setStatus("disconnected");
          }
        }
      }
    })();
  }, [currentUser?.id, loadFresh]);

  const connect = useCallback(async () => {
    await authClient.linkSocial({
      provider: "github",
      callbackURL: typeof window !== "undefined" ? window.location.href : "/",
    });
  }, []);

  const sync = useCallback(() => loadFresh(true), [loadFresh]);

  const disconnect = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!accountId) return { ok: false, error: "No linked GitHub account to disconnect." };
    const generation = generationRef.current;
    try {
      const result = await authClient.unlinkAccount({ accountId });
      if (result.error) {
        return { ok: false, error: result.error.message || "Could not disconnect GitHub." };
      }
      if (generation === generationRef.current) {
        setStatus("disconnected");
        setData(null);
        setAccountId(null);
        if (currentUser?.id) {
          delete memoryGithubCache[currentUser.id];
          try {
            localStorage.removeItem(`ratefactor_github_data_${currentUser.id}`);
          } catch {}
        }
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Could not disconnect GitHub." };
    }
  }, [accountId, currentUser?.id]);

  return {
    status,
    data,
    isSyncing,
    syncError,
    canDisconnect: otherLinkedAccountsCount > 0,
    connect,
    sync,
    disconnect,
  };
}
