import { getGithubAccessToken } from "./client";
import { fetchGithubProfile, GithubProfileData } from "./profile";
import { fetchGithubRepositories, GithubRepoData } from "./repositories";
import { fetchGithubContributions, GithubContributionsData } from "./contributions";
import { fetchGithubReadme, GithubReadmeData } from "./readme";
import { githubCache } from "./cache";

export interface GithubSyncResult {
  success: boolean;
  username: string;
  profile: GithubProfileData;
  repositories: GithubRepoData[];
  contributions: GithubContributionsData;
  profileReadme?: GithubReadmeData;
  syncedAt: string;
}

export async function syncGithubUser(
  betterAuthUserId: string | null,
  overrideUsername?: string,
  force = false
): Promise<GithubSyncResult> {
  const token = betterAuthUserId ? await getGithubAccessToken(betterAuthUserId) : null;
  if (betterAuthUserId && !token) throw new Error("No linked GitHub account was found for your session. Connect GitHub first.");
  const targetUser = betterAuthUserId ? "" : (overrideUsername || "").trim().replace(/^@/, "");
  if (force && targetUser) githubCache.invalidateUser(targetUser);

  const profile = await fetchGithubProfile(token, targetUser || undefined, force);
  const username = profile.username || targetUser;
  const [repositories, contributions, profileReadme] = await Promise.all([
    fetchGithubRepositories(token, username || undefined, force),
    fetchGithubContributions(token, username || undefined, force),
    username ? fetchGithubReadme(username, username, token, force).catch(() => null) : Promise.resolve(null),
  ]);

  return {
    success: true,
    username,
    profile,
    repositories,
    contributions,
    profileReadme: profileReadme || undefined,
    syncedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}
