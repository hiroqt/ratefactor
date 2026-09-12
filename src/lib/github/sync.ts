import { getGithubAccessToken } from "./client";
import { fetchGithubProfile, saveGithubProfile, GithubProfileData } from "./profile";
import { fetchGithubRepositories, saveGithubRepositories, GithubRepoData } from "./repositories";
import { fetchGithubContributions, saveGithubContributions, GithubContributionsData } from "./contributions";
import { fetchGithubReadme, saveGithubReadme, GithubReadmeData } from "./readme";

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
 * Orchestrates full GitHub synchronization for a RateFactor user.
 */
export async function syncGithubUser(
  userId: string,
  overrideUsername?: string
): Promise<GithubSyncResult> {
  const token = await getGithubAccessToken(userId).catch(() => null);

  // 1. Sync Profile
  const profile = await fetchGithubProfile(token, overrideUsername);
  const activeUsername = profile.username || overrideUsername || "developer";

  if (userId) {
    await saveGithubProfile(userId, profile).catch((err) =>
      console.warn("[syncGithubUser] Profile save warning:", err)
    );
  }

  // 2. Sync Repositories
  const repositories = await fetchGithubRepositories(token, activeUsername).catch(() => []);
  if (userId && repositories.length > 0) {
    await saveGithubRepositories(userId, repositories).catch((err) =>
      console.warn("[syncGithubUser] Repos save warning:", err)
    );
  }

  // 3. Sync Contributions
  const contributions = await fetchGithubContributions(token, activeUsername).catch(() => ({
    username: activeUsername,
    totalContributions: 0,
    currentStreak: 0,
    longestStreak: 0,
    days: [],
  }));
  if (userId && contributions.days.length > 0) {
    await saveGithubContributions(userId, contributions).catch((err) =>
      console.warn("[syncGithubUser] Contributions save warning:", err)
    );
  }

  // 4. Sync Profile README ({username}/{username})
  let profileReadme: GithubReadmeData | undefined = undefined;
  try {
    const readme = await fetchGithubReadme(activeUsername, activeUsername, token);
    if (readme && readme.contentMarkdown) {
      profileReadme = readme;
      if (userId) {
        await saveGithubReadme(userId, readme).catch((err) =>
          console.warn("[syncGithubUser] README save warning:", err)
        );
      }
    }
  } catch {}

  const syncedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return {
    success: true,
    username: activeUsername,
    profile,
    repositories,
    contributions,
    profileReadme,
    syncedAt,
  };
}
