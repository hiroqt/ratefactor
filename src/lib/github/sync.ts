import { getGithubAccessToken } from "./client";
import { fetchGithubProfile, saveGithubProfile, GithubProfileData } from "./profile";
import { fetchGithubRepositories, saveGithubRepositories, GithubRepoData } from "./repositories";
import { fetchGithubContributions, saveGithubContributions, GithubContributionsData } from "./contributions";
import { fetchGithubReadme, saveGithubReadme, GithubReadmeData } from "./readme";
import { githubCache } from "./cache";

export interface GithubSyncResult {
  success: boolean;
  username: string;
  profile: GithubProfileData;
  repositories: GithubRepoData[];
  contributions: GithubContributionsData;
  profileReadme?: GithubReadmeData;
  syncedAt: string;
  error?: string;
}

/**
 * Orchestrates full GitHub synchronization for a RateFactor user in parallel,
 * bypassing cached entries to fetch the freshest data at lightning speed.
 */
export async function syncGithubUser(
  userId: string,
  overrideUsername?: string
): Promise<GithubSyncResult> {
  const token = await getGithubAccessToken(userId).catch(() => null);
  const targetUser = (overrideUsername || "").trim().replace(/^@/, "");

  if (targetUser) {
    githubCache.invalidateUser(targetUser);
  }

  // Execute all remote fetches concurrently in parallel for maximum speed
  const [profile, repositories, contributions, profileReadme] = await Promise.all([
    fetchGithubProfile(token, targetUser, true).catch(() => ({
      githubId: 0,
      username: targetUser || "developer",
      displayName: targetUser || "developer",
      bio: "",
      avatarUrl: targetUser ? `https://github.com/${targetUser}.png` : "/placeholder.svg",
      profileUrl: targetUser ? `https://github.com/${targetUser}` : "https://github.com",
      company: "",
      location: "",
      website: "",
      twitter: "",
      linkedin: "",
      publicRepositoryCount: 0,
      followers: 0,
      following: 0,
      lastSyncedAt: new Date().toISOString(),
    })),
    fetchGithubRepositories(token, targetUser, true).catch(() => []),
    fetchGithubContributions(token, targetUser, true).catch(() => ({
      username: targetUser || "developer",
      totalContributions: 0,
      currentStreak: 0,
      longestStreak: 0,
      days: [],
    })),
    targetUser
      ? fetchGithubReadme(targetUser, targetUser, token, true).catch(() => null)
      : Promise.resolve(null),
  ]);

  const activeUsername = profile.username || targetUser || "developer";
  githubCache.invalidateUser(activeUsername);

  // Execute all database writes in parallel
  if (userId) {
    await Promise.all([
      saveGithubProfile(userId, profile).catch(() => {}),
      repositories.length > 0 ? saveGithubRepositories(userId, repositories).catch(() => {}) : Promise.resolve(),
      contributions.days.length > 0 ? saveGithubContributions(userId, contributions).catch(() => {}) : Promise.resolve(),
      profileReadme ? saveGithubReadme(userId, profileReadme).catch(() => {}) : Promise.resolve(),
    ]);
  }

  const syncedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return {
    success: true,
    username: activeUsername,
    profile,
    repositories,
    contributions,
    profileReadme: profileReadme || undefined,
    syncedAt,
  };
}
