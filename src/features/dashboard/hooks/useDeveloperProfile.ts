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
    return INITIAL_DEVELOPER_PROFILE;
  });

  // Load from localStorage on mount and sanitize any legacy placeholder strings
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ratefactor_dev_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clean out legacy placeholders if user is not specifically that person
        if (parsed.bio && parsed.bio.includes("Ready to share architectures")) {
          parsed.bio = "";
        }
        if (
          parsed.readmeMarkdown &&
          (parsed.readmeMarkdown.includes("Welcome to My Profile") ||
            parsed.readmeMarkdown.includes("Arnel Rivera"))
        ) {
          parsed.readmeMarkdown = "";
        }
        // Sanitize any stale or auto-inferred GitHub handles and personal presets
        if (
          parsed.githubSync?.username === "arnel" ||
          parsed.githubSync?.username === "cydefx" ||
          parsed.githubSync?.username === "cydefxgaming" ||
          (parsed.github && (parsed.github.includes("arnel") || parsed.github.includes("cydefx"))) ||
          parsed.name === "Arnel Rivera" ||
          parsed.name === "Arnel Baylon" ||
          (parsed.avatar && parsed.avatar.includes("avatars.githubusercontent.com/u/10313"))
        ) {
          delete parsed.githubSync;
          if (parsed.github && (parsed.github.includes("arnel") || parsed.github.includes("cydefx"))) {
            parsed.github = "";
          }
          if (parsed.name === "Arnel Rivera" || parsed.name === "Arnel Baylon") {
            parsed.name = "Developer";
          }
          if (parsed.avatar && parsed.avatar.includes("avatars.githubusercontent.com/u/10313")) {
            parsed.avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80";
          }
          try {
            localStorage.setItem("ratefactor_dev_profile", JSON.stringify(parsed));
          } catch (e) {}
        }
        memoryProfileCache = parsed;
        setDeveloperProfile(parsed);
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
        const nextName = currentUser.name || prev.name;
        const nextUsername = targetHandle || prev.username;
        const nextAvatar = currentUser.avatar || prev.avatar;
        const nextRole = currentUser.role || prev.role;

        if (
          prev.name === nextName &&
          prev.username === nextUsername &&
          prev.avatar === nextAvatar &&
          prev.role === nextRole
        ) {
          return prev;
        }

        const updated = {
          ...prev,
          name: nextName,
          username: nextUsername,
          avatar: nextAvatar,
          role: nextRole,
        };
        try {
          localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
        } catch (e) {
          // ignore
        }
        return updated;
      });

      // GitHub connection/sync itself is no longer driven from here: it's
      // resolved authoritatively from Better Auth's linked-account state
      // (see useGithubConnection), not from this profile's cached
      // githubSync.connected flag, which is a display cache only.
    }
  }, [currentUser?.username, currentUser?.name, currentUser?.avatar, currentUser?.role]);


  const updateProfile = useCallback((updated: DeveloperProfile) => {
    setDeveloperProfile(updated);
    try {
      localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
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
