"use client";

import { useState, useEffect, useCallback } from "react";
import { authClient, useSession, normalizeUsername } from "@/lib/auth/client";
import { setClientSessionToken, clearClientSessionToken } from "@/lib/cookies";

export interface AuthUser {
  id: string;
  name: string;
  email?: string | null;
  avatar: string;
  role: "user" | "developer" | "moderator" | "admin" | string;
  username: string;
  onboarded?: boolean;
  createdAt?: string;
}

export interface UseAuthOptions {
  onSignOut?: () => void;
  onAuthSuccess?: (user: AuthUser) => void;
}

export function useAuth(options?: UseAuthOptions) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authIntentMessage, setAuthIntentMessage] = useState<string>("");

  const { data: authSession, isPending } = useSession();

  // Set initialized on client mount
  useEffect(() => {
    setIsInitialized(true);
    try {
      const savedUser = localStorage.getItem("ratefactor_auth_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setCurrentUser((prev) => prev || parsed);
        if (parsed?.id) {
          setClientSessionToken(parsed.id);
        }
      }
    } catch (e) {}
  }, []);

  // Synchronize session from Better Auth
  useEffect(() => {
    if (authSession?.user) {
      const nextUsername = normalizeUsername(authSession.user.email || authSession.user.name);
      setCurrentUser((prev) => {
        const sessionRole = (authSession.user as any).role || "user";
        const sessionOnboarded = (authSession.user as any).onboarded;
        const sessionCreatedAt = (authSession.user as any).createdAt
          ? new Date((authSession.user as any).createdAt).toISOString()
          : prev?.createdAt;

        if (
          prev &&
          prev.id === authSession.user.id &&
          prev.name === (authSession.user.name || authSession.user.email?.split("@")[0] || "User") &&
          prev.email === authSession.user.email &&
          prev.username === nextUsername &&
          prev.avatar === (authSession.user.image || prev.avatar) &&
          prev.role === sessionRole &&
          prev.onboarded === sessionOnboarded &&
          prev.createdAt === sessionCreatedAt
        ) {
          return prev;
        }

        const isExistingAccount = sessionCreatedAt
          ? (Date.now() - new Date(sessionCreatedAt).getTime() > 10 * 60 * 1000)
          : false;

        const effectiveOnboarded = typeof sessionOnboarded === "boolean"
          ? sessionOnboarded
          : (isExistingAccount ? true : (prev?.onboarded ?? false));

        const u: AuthUser = {
          id: authSession.user.id,
          name: authSession.user.name || authSession.user.email?.split("@")[0] || "User",
          email: authSession.user.email,
          avatar:
            authSession.user.image ||
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
          role: sessionRole,
          username: nextUsername,
          onboarded: effectiveOnboarded,
          createdAt: sessionCreatedAt,
        };
        try {
          localStorage.setItem("ratefactor_auth_user", JSON.stringify(u));
          setClientSessionToken(u.id);
        } catch (e) {}
        return u;
      });
    }
  }, [authSession?.user?.id, authSession?.user?.email, authSession?.user?.name, authSession?.user?.image, (authSession?.user as any)?.role, (authSession?.user as any)?.onboarded, (authSession?.user as any)?.createdAt]);

  const requireAuth = useCallback((intent: string) => {
    setAuthIntentMessage(intent);
    setIsAuthModalOpen(true);
  }, []);

  const handleAuthSuccess = useCallback(
    (user: any) => {
      const u: AuthUser = {
        id: user.id || "user-" + Date.now(),
        name: user.name || user.email?.split("@")[0] || "User",
        email: user.email,
        avatar:
          user.avatar ||
          user.image ||
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
        role: user.role || "user",
        username: user.username || normalizeUsername(user.email || user.name),
        onboarded: user.onboarded ?? false,
        createdAt: user.createdAt
          ? new Date(user.createdAt).toISOString()
          : (user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString()),
      };
      setCurrentUser(u);
      try {
        localStorage.setItem("ratefactor_auth_user", JSON.stringify(u));
        setClientSessionToken(u.id);
      } catch (e) {
        // ignore
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ratefactor:user-registered", { detail: u }));
      }
      if (options?.onAuthSuccess) {
        options.onAuthSuccess(u);
      }
    },
    [options]
  );

  const handleSignOut = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    clearClientSessionToken();
    try {
      localStorage.removeItem("ratefactor_auth_user");
    } catch (e) {
      // ignore
    }
    if (options?.onSignOut) {
      options.onSignOut();
    }
  }, [options]);

  return {
    currentUser,
    setCurrentUser,
    isAuthenticated: Boolean(currentUser),
    isLoading: isPending || !isInitialized,
    isInitialized,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authIntentMessage,
    setAuthIntentMessage,
    requireAuth,
    handleAuthSuccess,
    handleSignOut,
    isDeveloper: Boolean(currentUser && currentUser.role !== "guest"),
    isModerator: currentUser?.role === "moderator" || currentUser?.role === "admin",
    isAdmin: currentUser?.role === "admin",
    needsOnboarding: Boolean(currentUser && currentUser.onboarded === false),
  };
}
