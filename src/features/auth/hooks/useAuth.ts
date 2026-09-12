"use client";

import { useState, useEffect, useCallback } from "react";
import { authClient, useSession, normalizeUsername } from "@/lib/auth/client";

export interface AuthUser {
  id: string;
  name: string;
  email?: string | null;
  avatar: string;
  role: "developer" | "moderator" | "admin" | string;
  username: string;
}

export interface UseAuthOptions {
  onSignOut?: () => void;
  onAuthSuccess?: (user: AuthUser) => void;
}

export function useAuth(options?: UseAuthOptions) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authIntentMessage, setAuthIntentMessage] = useState<string>("");

  const { data: authSession, isPending } = useSession();

  // Synchronize session from Better Auth
  useEffect(() => {
    if (authSession?.user) {
      const u: AuthUser = {
        id: authSession.user.id,
        name: authSession.user.name || authSession.user.email?.split("@")[0] || "Developer",
        email: authSession.user.email,
        avatar:
          authSession.user.image ||
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
        role: (authSession.user as any).role || "developer",
        username: normalizeUsername(authSession.user.email || authSession.user.name),
      };
      setCurrentUser(u);
      try {
        localStorage.setItem("ratefactor_auth_user", JSON.stringify(u));
      } catch (e) {
        // ignore
      }
    }
  }, [authSession]);

  // Read persisted fallback from localStorage if no active session yet
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("ratefactor_auth_user");
      if (savedUser && !authSession?.user) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {
      // ignore
    }
  }, [authSession]);

  const requireAuth = useCallback((intent: string) => {
    setAuthIntentMessage(intent);
    setIsAuthModalOpen(true);
  }, []);

  const handleAuthSuccess = useCallback(
    (user: any) => {
      const u: AuthUser = {
        id: user.id || "dev-" + Date.now(),
        name: user.name || user.email?.split("@")[0] || "Developer",
        email: user.email,
        avatar:
          user.avatar ||
          user.image ||
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
        role: user.role || "developer",
        username: user.username || normalizeUsername(user.email || user.name),
      };
      setCurrentUser(u);
      try {
        localStorage.setItem("ratefactor_auth_user", JSON.stringify(u));
      } catch (e) {
        // ignore
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
    isLoading: isPending,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authIntentMessage,
    setAuthIntentMessage,
    requireAuth,
    handleAuthSuccess,
    handleSignOut,
    isDeveloper: currentUser?.role === "developer",
    isModerator: currentUser?.role === "moderator" || currentUser?.role === "admin",
    isAdmin: currentUser?.role === "admin",
  };
}
