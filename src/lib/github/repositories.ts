import { pool } from "@/lib/auth/better-auth";
import { githubFetch } from "./client";

export interface GithubRepoData {
  id: string;
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
 * Fetches public repositories for the authenticated user or target username.
 */
export async function fetchGithubRepositories(
  token?: string | null,
  fallbackUsername?: string
): Promise<GithubRepoData[]> {
  const targetUsername = (fallbackUsername || "").trim().replace(/^@/, "");

  let rawRepos: any[] = [];

  // 1. Try authenticated /user/repos
  if (token) {
    try {
      rawRepos = await githubFetch(
        token,
        "/user/repos?visibility=public&affiliation=owner,collaborator&sort=pushed&per_page=100"
      );
    } catch (err) {
      console.warn("[fetchGithubRepositories] Authenticated /user/repos failed:", err);
    }
  }

  // 2. Fallback to public /users/{username}/repos
  if ((!rawRepos || rawRepos.length === 0) && targetUsername) {
    try {
      rawRepos = await githubFetch(
        null,
        `/users/${encodeURIComponent(targetUsername)}/repos?sort=pushed&per_page=100`
      );
    } catch (err) {
      console.warn("[fetchGithubRepositories] Public /users/repos failed:", err);
    }
  }

  if (!Array.isArray(rawRepos)) return [];

  return rawRepos
    .filter((r) => !r.private && !r.fork)
    .map((r) => ({
      id: String(r.id),
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
}

/**
 * Saves and caches repositories in PostgreSQL.
 */
export async function saveGithubRepositories(
  userId: string,
  repos: GithubRepoData[]
): Promise<void> {
  if (!userId || repos.length === 0) return;

  try {
    for (const r of repos) {
      await pool.query(
        `INSERT INTO public.github_repositories (
          user_id, github_repo_id, name, full_name, description, html_url,
          homepage, language, topics, stars, forks, is_private, created_at,
          updated_at, pushed_at, last_synced_at
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
  } catch (err) {
    console.warn("[saveGithubRepositories] DB error:", err);
  }
}

/**
 * Retrieves cached repositories from PostgreSQL.
 */
export async function getCachedGithubRepositories(userId: string): Promise<GithubRepoData[]> {
  if (!userId) return [];

  try {
    const res = await pool.query(
      `SELECT * FROM public.github_repositories
       WHERE user_id = $1
       ORDER BY pushed_at DESC NULLS LAST, stars DESC
       LIMIT 100`,
      [userId]
    );

    return res.rows.map((r) => ({
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
  } catch {
    return [];
  }
}
