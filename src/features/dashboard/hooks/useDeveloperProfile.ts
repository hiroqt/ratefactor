"use client";

import { useState, useEffect, useCallback } from "react";
import { DeveloperProfile, UserStatus } from "@/types/profile";
import { INITIAL_DEVELOPER_PROFILE } from "@/data/mockProfile";
import { AuthUser } from "@/features/auth/hooks/useAuth";

export function useDeveloperProfile(currentUser?: AuthUser | null) {
  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfile>(INITIAL_DEVELOPER_PROFILE);

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
        setDeveloperProfile(parsed);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Sync developerProfile with active Better Auth user
  useEffect(() => {
    if (currentUser) {
      const targetHandle = (currentUser.username || "").trim().replace(/^@/, "");

      setDeveloperProfile((prev) => {
        const updated = {
          ...prev,
          name: currentUser.name || prev.name,
          username: targetHandle || prev.username,
          avatar: currentUser.avatar || prev.avatar,
          role: currentUser.role || prev.role,
        };
        try {
          localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
        } catch (e) {
          // ignore
        }
        return updated;
      });

      // Auto-sync GitHub bio, public README.md, and contributions
      if (targetHandle && targetHandle !== "developer" && targetHandle !== "user-default") {
        fetch(`/api/github/contributions?username=${encodeURIComponent(targetHandle)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.profile) {
              setDeveloperProfile((prev) => {
                const updated: DeveloperProfile = {
                  ...prev,
                  name: data.profile.name || prev.name || targetHandle,
                  bio: data.profile.bio !== undefined ? data.profile.bio : prev.bio,
                  readmeMarkdown: data.readmeMarkdown !== undefined ? data.readmeMarkdown : prev.readmeMarkdown,
                  avatar: data.profile.avatar || prev.avatar,
                  company: data.profile.company || prev.company || "",
                  location: data.profile.location || prev.location || "",
                  website: data.profile.website || prev.website || "",
                  twitter: data.profile.twitter || prev.twitter || "",
                  linkedin: data.profile.linkedin || prev.linkedin || "",
                  github: data.profile.profileUrl || `https://github.com/${targetHandle}`,
                  githubSync: {
                    connected: true,
                    username: data.username,
                    avatarUrl: data.profile.avatar,
                    profileUrl: data.profile.profileUrl,
                    totalContributions: data.totalContributions,
                    currentStreak: data.currentStreak,
                    longestStreak: data.longestStreak,
                    publicRepos: data.profile.publicRepos,
                    followers: data.profile.followers,
                    lastSyncedAt: data.syncedAt || "Just now",
                  },
                };
                try {
                  localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
                } catch (e) {
                  // ignore
                }
                return updated;
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [currentUser]);

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
