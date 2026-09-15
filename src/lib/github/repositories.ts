import { githubFetch } from "./client";
import { githubCache, CACHE_TTL } from "./cache";

export interface GithubRepoData {
  id?: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  description?: string;
  htmlUrl: string;
  homepage?: string;
  language?: string;
  topics: string[];
  stars: number;
  forks: number;
  isPrivate: boolean;
  createdAt?: string;
  updatedAt?: string;
  pushedAt?: string;
  lastSyncedAt?: string;
}

/**
 * Fetches user repositories from GitHub with in-memory caching.
 */
export async function fetchGithubRepositories(
  token?: string | null,
  fallbackUsername?: string,
  bypassCache = false
): Promise<GithubRepoData[]> {
  const targetUsername = (fallbackUsername || "").trim().replace(/^@/, "");
  // Authenticated self lookups (no target username) bypass the in-memory
  // cache entirely — see the matching comment in profile.ts for why a
  // shared "viewer" slot would leak between users.
  const cacheKey = token ? null : targetUsername ? `repos:${targetUsername.toLowerCase()}` : null;

  if (!bypassCache && cacheKey) {
    const cached = githubCache.get<GithubRepoData[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  let repos: any[] = [];

  // 1. If target username is specified, fetch that user's public repositories
  if (targetUsername) {
    try {
      const data = await githubFetch(
        token || null,
        `/users/${encodeURIComponent(targetUsername)}/repos?per_page=100&sort=pushed`
      );
      if (Array.isArray(data)) {
        repos = data;
      }
    } catch {
      // Fallback
    }
  } else if (token) {
    // 2. If no target username, fetch authenticated user's own repositories.
    // A failure here must propagate rather than silently returning an empty
    // list indistinguishable from "this user genuinely has zero repos".
    try {
      const data = await githubFetch(
        token,
        "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator"
      );
      if (Array.isArray(data)) {
        repos = data;
      } else {
        throw new Error("GitHub did not return a valid repository list.");
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed to fetch authenticated GitHub repositories.");
    }
  }

  const mapped: GithubRepoData[] = repos.map((r) => ({
    githubRepoId: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description || undefined,
    htmlUrl: r.html_url,
    homepage: r.homepage || undefined,
    language: r.language || undefined,
    topics: Array.isArray(r.topics) ? r.topics : [],
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    isPrivate: Boolean(r.private),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pushedAt: r.pushed_at,
    lastSyncedAt: new Date().toISOString(),
  }));

  if (cacheKey) githubCache.set(cacheKey, mapped, CACHE_TTL.REPOSITORIES);
  return mapped;
}
