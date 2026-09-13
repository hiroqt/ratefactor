"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

  const lastSyncedHandleRef = useRef<string | null>(null);

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
        // Purge stale accidental GitHub sync for "arnel" (Arnel Rivera) if it was inadvertently fetched from email prefix
        if (
          parsed.githubSync?.username === "arnel" ||
          parsed.github === "https://github.com/arnel" ||
          parsed.name === "Arnel Rivera" ||
          (parsed.avatar && parsed.avatar.includes("avatars.githubusercontent.com/u/10313"))
        ) {
          delete parsed.githubSync;
          if (parsed.github === "https://github.com/arnel") {
            parsed.github = "";
          }
          if (parsed.name === "Arnel Rivera") {
            parsed.name = "Arnel Baylon";
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
      lastSyncedHandleRef.current = null;
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

      // Auto-sync GitHub bio, public README.md, and contributions ONLY for the verified GitHub username
      const extractGithubUsername = (urlOrHandle?: string) => {
        if (!urlOrHandle) return "";
        return urlOrHandle
          .replace(/^https?:\/\/github\.com\//i, "")
          .replace(/\/$/, "")
          .replace(/^@/, "")
          .trim();
      };

      const explicitGithub =
        extractGithubUsername(developerProfile.github) ||
        (developerProfile.githubSync?.username && developerProfile.githubSync.username !== "developer"
          ? developerProfile.githubSync.username.trim().replace(/^@/, "")
          : "");

      // Case A: User has an explicit GitHub URL or handle entered
      if (explicitGithub && explicitGithub !== "user-default" && lastSyncedHandleRef.current !== explicitGithub) {
        lastSyncedHandleRef.current = explicitGithub;
        fetch(`/api/github/contributions?username=${encodeURIComponent(explicitGithub)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.profile) {
              setDeveloperProfile((prev) => {
                const updated: DeveloperProfile = {
                  ...prev,
                  name: data.profile.name || prev.name || explicitGithub,
                  bio: data.profile.bio !== undefined && data.profile.bio !== "" ? data.profile.bio : prev.bio,
                  readmeMarkdown: data.readmeMarkdown !== undefined && data.readmeMarkdown !== "" ? data.readmeMarkdown : prev.readmeMarkdown,
                  avatar: data.profile.avatar || prev.avatar,
                  company: data.profile.company || prev.company || "",
                  location: data.profile.location || prev.location || "",
                  website: data.profile.website || prev.website || "",
                  twitter: data.profile.twitter || prev.twitter || "",
                  linkedin: data.profile.linkedin || prev.linkedin || "",
                  github: data.profile.profileUrl || `https://github.com/${explicitGithub}`,
                  githubSync: {
                    connected: true,
                    username: data.username || explicitGithub,
                    avatarUrl: data.profile.avatar,
                    profileUrl: data.profile.profileUrl || `https://github.com/${explicitGithub}`,
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
                } catch (e) {}
                return updated;
              });
            }
          })
          .catch(() => {});
      } else if (
        !explicitGithub &&
        (currentUser.avatar?.includes("githubusercontent") || (currentUser as any).provider === "github")
      ) {
        // Case B: User signed in via GitHub OAuth without explicit manual handle - query verified GitHub account
        fetch("/api/github/profile")
          .then((res) => (res.ok ? res.json() : null))
          .then((profileData) => {
            if (profileData?.username && profileData.username !== "developer" && lastSyncedHandleRef.current !== profileData.username) {
              const verifiedHandle = profileData.username;
              lastSyncedHandleRef.current = verifiedHandle;
              fetch(`/api/github/contributions?username=${encodeURIComponent(verifiedHandle)}`)
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                  if (data) {
                    setDeveloperProfile((prev) => {
                      const updated: DeveloperProfile = {
                        ...prev,
                        github: profileData.profileUrl || `https://github.com/${verifiedHandle}`,
                        githubSync: {
                          connected: true,
                          username: verifiedHandle,
                          avatarUrl: profileData.avatarUrl || data.profile?.avatar,
                          profileUrl: profileData.profileUrl || `https://github.com/${verifiedHandle}`,
                          totalContributions: data.totalContributions,
                          currentStreak: data.currentStreak,
                          longestStreak: data.longestStreak,
                          publicRepos: profileData.publicRepositoryCount || data.profile?.publicRepos,
                          followers: profileData.followers || data.profile?.followers,
                          lastSyncedAt: data.syncedAt || "Just now",
                        },
                      };
                      try {
                        localStorage.setItem("ratefactor_dev_profile", JSON.stringify(updated));
                      } catch (e) {}
                      return updated;
                    });
                  }
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
  }, [currentUser?.username, currentUser?.name, currentUser?.avatar, currentUser?.role, developerProfile.github]);


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
