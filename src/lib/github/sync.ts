import { getGithubAccessToken } from "./client";
import { fetchGithubProfile, saveGithubProfile, getCachedGithubProfile, GithubProfileData } from "./profile";
import { fetchGithubRepositories, saveGithubRepositories, getCachedGithubRepositories, GithubRepoData } from "./repositories";
import { fetchGithubContributions, saveGithubContributions, getCachedGithubContributions, GithubContributionsData } from "./contributions";
import { fetchGithubReadme, saveGithubReadme, getCachedGithubReadme, GithubReadmeData } from "./readme";
import { githubCache } from "./cache";
import { resolveCanonicalProfileId } from "@/lib/auth/profile-id";

export interface GithubSyncResult {
  success: boolean;
  username: string;
  profile: GithubProfileData;
  repositories: GithubRepoData[];
  contributions: GithubContributionsData;
  profileReadme?: GithubReadmeData;
  syncedAt: string;
  error?: string;
  persisted: boolean;
}

/**
 * Orchestrates full GitHub synchronization for the authenticated RateFactor
 * user's OWN linked GitHub account. When `force === false`, returns cached
 * data from PostgreSQL/memory immediately if available.
 * `betterAuthUserId` must be the actual signed-in session's Better Auth user id.
 */
export async function syncGithubUser(
  betterAuthUserId: string | null,
  overrideUsername?: string,
  force = true
): Promise<GithubSyncResult> {
  const token = betterAuthUserId ? await getGithubAccessToken(betterAuthUserId).catch(() => null) : null;

  if (betterAuthUserId && !token) {
    throw new Error("No linked GitHub account was found for your session. Connect GitHub first.");
  }

  // Fast-path for page reload / hydration: return cached data immediately if available
  if (betterAuthUserId && !force) {
    const canonicalProfileId = resolveCanonicalProfileId(betterAuthUserId);
    const [cachedProfile, cachedContributions, cachedRepos] = await Promise.all([
      getCachedGithubProfile(canonicalProfileId).catch(() => null),
      getCachedGithubContributions(canonicalProfileId).catch(() => null),
      getCachedGithubRepositories(canonicalProfileId).catch(() => []),
    ]);

    if (cachedProfile && cachedContributions && cachedContributions.days && cachedContributions.days.length > 0) {
      const readmeFullName = cachedProfile.username ? `${cachedProfile.username}/${cachedProfile.username}` : "";
      const cachedReadme = readmeFullName
        ? await getCachedGithubReadme(canonicalProfileId, readmeFullName).catch(() => null)
        : null;

      const syncedAt = cachedProfile.lastSyncedAt
        ? new Date(cachedProfile.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      return {
        success: true,
        username: cachedProfile.username || "developer",
        profile: cachedProfile,
        repositories: cachedRepos || [],
        contributions: cachedContributions,
        profileReadme: cachedReadme || undefined,
        syncedAt,
        persisted: true,
      };
    }
  }

  // Only an unauthenticated/public lookup may specify a username directly;
  // an authenticated user's own sync always resolves identity from `token`.
  const targetUser = !betterAuthUserId ? (overrideUsername || "").trim().replace(/^@/, "") : "";

  if (targetUser) {
    githubCache.invalidateUser(targetUser);
  }

  // Profile is fetched first (not in the Promise.all below) because the
  // profile README lookup for an authenticated self-sync needs the real
  // GitHub username the profile fetch resolves — there is no client-supplied
  // username to key it off for that case (see targetUser above).
  //
  // For an authenticated self lookup, fetchGithubProfile/Repositories/
  // Contributions throw on a genuine failure instead of returning
  // placeholder/zero data, so a real GitHub outage propagates here rather
  // than being silently persisted and returned as if the sync succeeded.
  // The public/unauthenticated path (targetUser set) is unaffected: those
  // fetchers still fall back to placeholder/demo data internally.
  const profile = await fetchGithubProfile(token, targetUser, true).catch((err) => {
    if (betterAuthUserId) throw err;
    return {
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
    };
  });

  const readmeUser = profile.username || targetUser;

  const [repositories, contributions, profileReadme] = await Promise.all([
    fetchGithubRepositories(token, targetUser, true).catch((err) => {
      if (betterAuthUserId) throw err;
      return [];
    }),
    fetchGithubContributions(token, targetUser, true).catch((err) => {
      if (betterAuthUserId) throw err;
      return {
        username: targetUser || "developer",
        totalContributions: 0,
        currentStreak: 0,
        longestStreak: 0,
        days: [],
      };
    }),
    readmeUser
      ? fetchGithubReadme(readmeUser, readmeUser, token, true).catch(() => null)
      : Promise.resolve(null),
  ]);

  const activeUsername = profile.username || targetUser || "developer";
  githubCache.invalidateUser(activeUsername);

  // Persist under the canonical public.profiles UUID — never the raw Better
  // Auth TEXT id — and track whether persistence actually succeeded (each
  // save* helper returns a boolean reflecting the real DB result, it never
  // throws) so the caller can report a truthful status instead of assuming
  // success just because the GitHub fetch succeeded. `persisted` requires
  // every write that was actually attempted to have succeeded (AND, not OR)
  // — a write that was legitimately skipped (e.g. no README to sync) still
  // resolves `true` above and doesn't count against this.
  let persisted = false;
  const persistenceFailures: string[] = [];
  if (betterAuthUserId) {
    const canonicalProfileId = resolveCanonicalProfileId(betterAuthUserId);
    const [profileSaved, reposSaved, contributionsSaved, readmeSaved] = await Promise.all([
      saveGithubProfile(canonicalProfileId, profile),
      repositories.length > 0 ? saveGithubRepositories(canonicalProfileId, repositories) : Promise.resolve(true),
      contributions.days.length > 0 ? saveGithubContributions(canonicalProfileId, contributions) : Promise.resolve(true),
      profileReadme ? saveGithubReadme(canonicalProfileId, profileReadme) : Promise.resolve(true),
    ]);
    persisted = profileSaved && reposSaved && contributionsSaved && readmeSaved;
    if (!profileSaved) { persistenceFailures.push("profile"); console.warn("[syncGithubUser] github_profiles persistence failed"); }
    if (!reposSaved) { persistenceFailures.push("repositories"); console.warn("[syncGithubUser] github_repositories persistence failed"); }
    if (!contributionsSaved) { persistenceFailures.push("contributions"); console.warn("[syncGithubUser] github_contributions persistence failed"); }
    if (!readmeSaved) { persistenceFailures.push("readme"); console.warn("[syncGithubUser] github_readmes persistence failed"); }
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
    persisted,
    error: persistenceFailures.length > 0
      ? `GitHub data was refreshed, but some data could not be saved (${persistenceFailures.join(", ")}).`
      : undefined,
  };
}
