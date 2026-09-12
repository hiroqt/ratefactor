import { pool } from "@/lib/auth/better-auth";
import { githubFetch } from "./client";
import { githubCache, CACHE_TTL } from "./cache";
import { safeDbQuery } from "./db";

export interface GithubReadmeData {
  repositoryFullName: string;
  contentMarkdown: string;
  contentSha?: string;
  sourceUrl: string;
  lastSyncedAt?: string;
}

/**
 * Decodes base64 string safely (handling UTF-8 / multiline properly).
 */
function decodeBase64Utf8(base64: string): string {
  try {
    const clean = base64.replace(/\s/g, "");
    return Buffer.from(clean, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

/**
 * Strips script tags, iframe tags, and hazardous HTML patterns from README.
 */
function sanitizeReadmeMarkdown(raw: string): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "");
}

/**
 * Fetches repository README from GitHub with in-memory caching.
 */
export async function fetchGithubReadme(
  owner: string,
  repo: string,
  token?: string | null,
  bypassCache = false
): Promise<GithubReadmeData | null> {
  const cleanOwner = (owner || "").trim().replace(/^@/, "");
  const cleanRepo = (repo || "").trim();

  if (!cleanOwner || !cleanRepo) return null;

  const repoFullName = `${cleanOwner}/${cleanRepo}`;
  const cacheKey = `readme:${repoFullName.toLowerCase()}`;

  if (!bypassCache) {
    const cached = githubCache.get<GithubReadmeData>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // 1. Try REST API GET /repos/{owner}/{repo}/readme
  try {
    const data: any = await githubFetch(
      token,
      `/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/readme`
    );

    if (data && data.content) {
      const decoded = decodeBase64Utf8(data.content);
      const sanitized = sanitizeReadmeMarkdown(decoded);

      const result: GithubReadmeData = {
        repositoryFullName: repoFullName,
        contentMarkdown: sanitized,
        contentSha: data.sha || undefined,
        sourceUrl: data.html_url || `https://github.com/${repoFullName}/blob/main/README.md`,
        lastSyncedAt: new Date().toISOString(),
      };

      githubCache.set(cacheKey, result, CACHE_TTL.README);
      return result;
    }
  } catch {
    // Fallback to raw githubusercontent.com
  }

  // 2. Fallback to raw URLs (main / master branches)
  const branchCandidates = ["main", "master"];
  for (const branch of branchCandidates) {
    try {
      const rawRes = await fetch(
        `https://raw.githubusercontent.com/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/${branch}/README.md`,
        {
          headers: {
            "User-Agent": "RateFactor-App/1.0",
          },
          next: { revalidate: 600 },
        }
      );

      if (rawRes.ok) {
        const text = await rawRes.text();
        const sanitized = sanitizeReadmeMarkdown(text);

        const result: GithubReadmeData = {
          repositoryFullName: repoFullName,
          contentMarkdown: sanitized,
          sourceUrl: `https://github.com/${repoFullName}/blob/${branch}/README.md`,
          lastSyncedAt: new Date().toISOString(),
        };

        githubCache.set(cacheKey, result, CACHE_TTL.README);
        return result;
      }
    } catch {}
  }

  return null;
}

/**
 * Saves and caches README in PostgreSQL safely.
 */
export async function saveGithubReadme(
  userId: string,
  data: GithubReadmeData
): Promise<void> {
  if (!userId || !data.contentMarkdown) return;

  await safeDbQuery(
    `INSERT INTO public.github_readmes (
      user_id, repository_full_name, content_markdown, content_sha, source_url, last_synced_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (user_id, repository_full_name) DO UPDATE SET
      content_markdown = EXCLUDED.content_markdown,
      content_sha = EXCLUDED.content_sha,
      source_url = EXCLUDED.source_url,
      last_synced_at = NOW(),
      updated_at = NOW()`,
    [
      userId,
      data.repositoryFullName,
      data.contentMarkdown,
      data.contentSha || null,
      data.sourceUrl,
    ]
  );

  // If this is the user's profile README (e.g. {username}/{username}), update public.profiles.readme_markdown
  const [owner, repoName] = data.repositoryFullName.split("/");
  if (owner && repoName && owner.toLowerCase() === repoName.toLowerCase()) {
    await safeDbQuery(
      `UPDATE public.profiles
       SET readme_markdown = $2, updated_at = NOW()
       WHERE id = $1`,
      [userId, data.contentMarkdown]
    );
  }
}

/**
 * Retrieves cached README from PostgreSQL.
 */
export async function getCachedGithubReadme(
  userId: string,
  repositoryFullName: string
): Promise<GithubReadmeData | null> {
  if (!userId || !repositoryFullName) return null;

  const res = await safeDbQuery(
    `SELECT * FROM public.github_readmes
     WHERE user_id = $1 AND repository_full_name = $2
     LIMIT 1`,
    [userId, repositoryFullName]
  );

  if (!res || !res.rows || res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    repositoryFullName: r.repository_full_name,
    contentMarkdown: r.content_markdown,
    contentSha: r.content_sha || undefined,
    sourceUrl: r.source_url,
    lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at).toISOString() : undefined,
  };
}
