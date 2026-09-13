import { pool } from "@/lib/auth/better-auth";
import { githubFetch } from "./client";
import { githubCache, CACHE_TTL } from "./cache";
import { safeDbQuery } from "./db";

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
  const cacheKey = `repos:${(targetUsername || "viewer").toLowerCase()}`;

  if (!bypassCache) {
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
    // 2. If no target username, fetch authenticated user's own repositories
    try {
      const data = await githubFetch(
        token,
        "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator"
      );
      if (Array.isArray(data)) {
        repos = data;
      }
    } catch {
      // Fallback
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

  githubCache.set(cacheKey, mapped, CACHE_TTL.REPOSITORIES);
  return mapped;
}

/**
 * Saves and caches repositories in PostgreSQL safely.
 */
export async function saveGithubRepositories(
  userId: string,
  repos: GithubRepoData[]
): Promise<void> {
  if (!userId || repos.length === 0) return;

  for (const r of repos) {
    await safeDbQuery(
      `INSERT INTO public.github_repositories (
        user_id, github_repo_id, name, full_name, description, html_url,
        homepage, language, topics, stars, forks, is_private, created_at,
        updated_at, pushedAt, last_synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      ON CONFLICT (user_id, github_repo_id) DO UPDATE SET
        name = EXCLUDED.name,
        full_name = EXCLUDED.full_name,
        description = EXCLUDED.description,
        html_url = EXCLUDED.html_url,
        homepage = EXCLUDED.homepage,
        language = EXCLUDED.language,
        topics = EXCLUDED.topics,
        stars = EXCLUDED.stars,
        forks = EXCLUDED.forks,
        is_private = EXCLUDED.is_private,
        updated_at = EXCLUDED.updated_at,
        pushed_at = EXCLUDED.pushed_at,
        last_synced_at = NOW()`,
      [
        userId,
        r.githubRepoId,
        r.name,
        r.fullName,
        r.description || null,
        r.htmlUrl,
        r.homepage || null,
        r.language || null,
        r.topics,
        r.stars,
        r.forks,
        r.isPrivate,
        r.createdAt ? new Date(r.createdAt) : null,
        r.updatedAt ? new Date(r.updatedAt) : null,
        r.pushedAt ? new Date(r.pushedAt) : null,
      ]
    );
  }
}

/**
 * Retrieves cached repositories from PostgreSQL.
 */
export async function getCachedGithubRepositories(userId: string): Promise<GithubRepoData[]> {
  if (!userId) return [];

  const res = await safeDbQuery(
    `SELECT * FROM public.github_repositories
     WHERE user_id = $1
     ORDER BY pushed_at DESC NULLS LAST, stars DESC
     LIMIT 100`,
    [userId]
  );

  if (!res || !res.rows) return [];

  return res.rows.map((r: any) => ({
    id: r.id,
    githubRepoId: Number(r.github_repo_id),
    name: r.name,
    fullName: r.full_name,
    description: r.description || undefined,
    htmlUrl: r.html_url,
    homepage: r.homepage || undefined,
    language: r.language || undefined,
    topics: r.topics || [],
    stars: r.stars || 0,
    forks: r.forks || 0,
    isPrivate: Boolean(r.is_private),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    pushedAt: r.pushed_at ? new Date(r.pushed_at).toISOString() : undefined,
    lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at).toISOString() : undefined,
  }));
}
