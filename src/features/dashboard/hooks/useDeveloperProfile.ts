"use client";

import { useState, useEffect, useCallback } from "react";
import { DeveloperProfile, UserStatus } from "@/types/profile";
import { INITIAL_DEVELOPER_PROFILE } from "@/data/mockProfile";
import { AuthUser } from "@/features/auth/hooks/useAuth";

// Shared in-memory profile cache across route transitions
let memoryProfileCache: DeveloperProfile | null = null;

export function useDeveloperProfile(currentUser?: AuthUser | null) {
  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile>(() => {
    if (memoryProfileCache) {
      return memoryProfileCache;
    }
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ratefactor_dev_profile");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object" && parsed.name) {
            memoryProfileCache = parsed;
            return parsed;
          }
        }
      } catch {}
    }
    return INITIAL_DEVELOPER_PROFILE;
  });

  // Load from localStorage on mount and clean any legacy placeholder strings
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ratefactor_dev_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clean out legacy placeholders if user is not specifically that person
        if (parsed.bio && parsed.bio.includes("Ready to share architectures")) {
          parsed.bio = "";
        }
        if (parsed.joinedDate === "2026") {
          delete parsed.joinedDate;
        }
        if (
          parsed.readmeMarkdown &&
          parsed.readmeMarkdown.includes("Welcome to My Profile")
        ) {
          parsed.readmeMarkdown = "";
        }
        memoryProfileCache = parsed;
        setDeveloperProfile((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (developerProfile) {
      memoryProfileCache = developerProfile;
    }
  }, [developerProfile]);

  // Clear profile and reset cache when user signs out
  useEffect(() => {
    if (currentUser === null) {
      memoryProfileCache = null;
      try {
        localStorage.removeItem("ratefactor_dev_profile");
      } catch {}
      setDeveloperProfile({
        ...INITIAL_DEVELOPER_PROFILE,
        name: "Guest Developer",
        username: "developer",
        bio: "",
        readmeMarkdown: "",
        github: "",
        twitter: "",
        linkedin: "",
        website: "",
        githubSync: undefined,
        isVerified: false,
      });
    }
  }, [currentUser]);

  // Sync developerProfile with active Better Auth user
  useEffect(() => {
    if (currentUser) {
      const targetHandle = (currentUser.username || "").trim().replace(/^@/, "");

      setDeveloperProfile((prev) => {
        // Only adopt currentUser values if the current profile has default/placeholder values
        const isPlaceholderName = !prev.name || prev.name === "Guest Developer" || prev.name === "Developer";
        const isPlaceholderUsername = !prev.username || prev.username === "developer" || prev.username === "guest";
        const isPlaceholderAvatar = !prev.avatar;

        const nextName = isPlaceholderName ? (currentUser.name || prev.name) : prev.name;
        const nextUsername = isPlaceholderUsername ? (targetHandle || prev.username) : prev.username;
        const nextAvatar = isPlaceholderAvatar ? (currentUser.avatar || prev.avatar) : prev.avatar;
        const nextRole = (prev.role && prev.role !== "user") ? prev.role : (currentUser.role || prev.role);
        const nextJoinedDate = (currentUser.createdAt && currentUser.createdAt !== "2026")
          ? currentUser.createdAt
          : (prev.joinedDate && prev.joinedDate !== "2026" ? prev.joinedDate : undefined);

        if (
          prev.name === nextName &&
          prev.username === nextUsername &&
          prev.avatar === nextAvatar &&
          prev.role === nextRole &&
          (!nextJoinedDate || prev.joinedDate === nextJoinedDate)
        ) {
          return prev;
        }

        const updated: DeveloperProfile = {
          ...prev,
          name: nextName,
          username: nextUsername,
          avatar: nextAvatar,
          role: nextRole,
          joinedDate: nextJoinedDate || prev.joinedDate,
        };
        try {
          localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
        } catch (e) {
          // ignore
        }
        return updated;
      });
    }
  }, [currentUser?.username, currentUser?.name, currentUser?.avatar, currentUser?.role, currentUser?.createdAt]);

  // Fetch authoritative profile from API if user is authenticated to sync database joinedDate & configured profile
  useEffect(() => {
    if (!currentUser?.id) return;
    let isCancelled = false;

    const syncApiProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          const p = data.profile || data;
          if (p && !isCancelled) {
            setDeveloperProfile((prev) => {
              const authoritativeJoinedDate =
                (p.joinedDate && p.joinedDate !== "2026")
                  ? p.joinedDate
                  : (currentUser.createdAt || (prev.joinedDate !== "2026" ? prev.joinedDate : undefined));

              const merged: DeveloperProfile = {
                ...prev,
                ...p,
                name: p.name || prev.name,
                username: p.username || prev.username,
                avatar: p.avatar || prev.avatar,
                role: p.role || prev.role,
                joinedDate: authoritativeJoinedDate || prev.joinedDate,
              };
              memoryProfileCache = merged;
              try {
                localStorage.setItem("ratefactor_dev_profile", JSON.stringify(merged));
                const rawAuth = localStorage.getItem("ratefactor_auth_user");
                if (rawAuth) {
                  const parsedAuth = JSON.parse(rawAuth);
                  if (merged.name) parsedAuth.name = merged.name;
                  if (merged.username) parsedAuth.username = merged.username;
                  if (merged.avatar) parsedAuth.avatar = merged.avatar;
                  if (merged.role) parsedAuth.role = merged.role;
                  localStorage.setItem("ratefactor_auth_user", JSON.stringify(parsedAuth));
                }
              } catch {}
              return merged;
            });
          }
        }
      } catch {}
    };

    syncApiProfile();
    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, currentUser?.createdAt]);


  const updateProfile = useCallback((updated: DeveloperProfile) => {
    setDeveloperProfile(updated);
    memoryProfileCache = updated;
    try {
      localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
      const rawAuth = localStorage.getItem("ratefactor_auth_user");
      if (rawAuth) {
        const parsedAuth = JSON.parse(rawAuth);
        if (updated.name) parsedAuth.name = updated.name;
        if (updated.username) parsedAuth.username = updated.username;
        if (updated.avatar) parsedAuth.avatar = updated.avatar;
        if (updated.role) parsedAuth.role = updated.role;
        localStorage.setItem("ratefactor_auth_user", JSON.stringify(parsedAuth));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const updateStatus = useCallback((status: UserStatus) => {
    setDeveloperProfile((prev) => {
      const updated = { ...prev, status };
      try {
        localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  }, []);

  const updateBio = useCallback((bio: string, readmeMarkdown?: string) => {
    setDeveloperProfile((prev) => {
      const updated = {
        ...prev,
        bio,
        readmeMarkdown: readmeMarkdown !== undefined ? readmeMarkdown : prev.readmeMarkdown,
      };
      try {
        localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  }, []);

  const updatePins = useCallback((pinnedPortfolioIds: string[], spotlightPortfolioId?: string) => {
    setDeveloperProfile((prev) => {
      const updated = {
        ...prev,
        pinnedPortfolioIds,
        spotlightPortfolioId: spotlightPortfolioId !== undefined ? spotlightPortfolioId : prev.spotlightPortfolioId,
      };
      try {
        localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  }, []);

  return {
    developerProfile,
    setDeveloperProfile,
    updateProfile,
    updateStatus,
    updateBio,
    updatePins,
  };
}
