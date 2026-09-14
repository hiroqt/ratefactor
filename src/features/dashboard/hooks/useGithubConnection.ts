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
export function useGithubConnection(currentUser?: AuthUser | null) {
  const [status, setStatus] = useState<GithubConnectionStatus>(currentUser ? "loading" : "disconnected");
  const [data, setData] = useState<GithubConnectionData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [otherLinkedAccountsCount, setOtherLinkedAccountsCount] = useState(0);
  // Bumped on every user-identity change. An in-flight request captures the
  // generation it started with and discards its result if the generation has
  // since moved on — this is what actually prevents a stale response (from a
  // prior user, or from a React Strict Mode double-invoked effect) from
  // overwriting current state, and it works without relying on effect
  // cleanup timing the way a ref-based "already checked" guard would: that
  // pattern breaks under Strict Mode's mount→cleanup→remount because the
  // remount sees the guard already set and returns early, leaving status
  // stuck on "loading" forever.
  const generationRef = useRef(0);

  const loadFresh = useCallback(async (force: boolean) => {
    const generation = generationRef.current;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/github/sync", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || "Could not refresh GitHub data.");
      }
      if (generation !== generationRef.current) return;
      setData({
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
      });
      setStatus("connected");
      // A successful sync can still have partially failed to persist (e.g.
      // one table write failed) — the fetch/refresh itself succeeded so this
      // isn't a connection or fetch failure, but it's worth surfacing.
      if (json.persisted === false && json.error) {
        setSyncError(json.error);
      }
    } catch (err: any) {
      if (generation !== generationRef.current) return;
      // A refresh/sync failure while GitHub is genuinely linked must not
      // flip the UI to "disconnected" — connection truth and sync freshness
      // are separate states. Keep showing whatever data we already have.
      setSyncError("Couldn't refresh GitHub right now. Showing previously synced data.");
    } finally {
      if (generation === generationRef.current) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const generation = ++generationRef.current;

    if (!currentUser) {
      setStatus("disconnected");
      setData(null);
      setAccountId(null);
      setOtherLinkedAccountsCount(0);
      return;
    }

    setStatus("loading");
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
          return;
        }

        setAccountId(githubAccount.id || null);
        setOtherLinkedAccountsCount(accounts.length - 1);
        setStatus("connected");
        await loadFresh(false);
      } catch {
        if (generation === generationRef.current) {
          // Better Auth's account list itself is unreachable — we cannot
          // authoritatively confirm a link either way. Do not claim
          // "connected" without evidence.
          setStatus("disconnected");
        }
      }
    })();
  }, [currentUser?.id, loadFresh]);

  const connect = useCallback(async () => {
    // The user reaching this control is already authenticated (Google,
    // GitHub, or email) — linkSocial attaches GitHub to that existing
    // session instead of starting a brand new sign-in.
    await authClient.linkSocial({
      provider: "github",
      callbackURL: typeof window !== "undefined" ? window.location.href : "/",
    });
  }, []);

  const sync = useCallback(() => loadFresh(true), [loadFresh]);

  const disconnect = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!accountId) return { ok: false, error: "No linked GitHub account to disconnect." };
    // Capture the generation before the async unlink call. If the session
    // switches (logout/login as another user) while this request is still
    // in flight, generationRef will have moved on by the time it resolves —
    // that stale result must not clear or alter the NEW user's connection
    // state, even though the unlink itself genuinely succeeded for the
    // user who requested it.
    const generation = generationRef.current;
    try {
      const result = await authClient.unlinkAccount({ accountId });
      if (result.error) {
        // Better Auth itself refuses to unlink a user's last remaining
        // account (FAILED_TO_UNLINK_LAST_ACCOUNT) — surface that message
        // as-is rather than letting the user lock themselves out.
        return { ok: false, error: result.error.message || "Could not disconnect GitHub." };
      }
      if (generation === generationRef.current) {
        setStatus("disconnected");
        setData(null);
        setAccountId(null);
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Could not disconnect GitHub." };
    }
  }, [accountId]);

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
