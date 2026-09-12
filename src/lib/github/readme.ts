import { pool } from "@/lib/auth/better-auth";
import { githubFetch } from "./client";

export interface GithubReadmeData {
  repositoryFullName: string;
  contentMarkdown: string;
  contentSha?: string;
  sourceUrl: string;
  lastSyncedAt?: string;
}

/**
 * Sanitizes markdown string to prevent script injection while preserving markdown structure.
 */
export function sanitizeMarkdown(raw: string): string {
  if (!raw) return "";
  // Strip <script> and dangerous attributes
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/javascript:[^"']*/gi, "")
    .trim();
}

/**
 * Fetches and decodes the README of a public repository.
 */
export async function fetchGithubReadme(
  owner: string,
  repo: string,
  token?: string | null
): Promise<GithubReadmeData | null> {
  const cleanOwner = encodeURIComponent(owner.trim());
  const cleanRepo = encodeURIComponent(repo.trim());
  const repoFullName = `${owner}/${repo}`;
  const sourceUrl = `https://github.com/${owner}/${repo}`;

  // 1. Try Authenticated /repos/{owner}/{repo}/readme
  try {
    const res: any = await githubFetch(token, `/repos/${cleanOwner}/${cleanRepo}/readme`);
    if (res && res.content) {
      const decoded = Buffer.from(res.content, "base64").toString("utf-8");
      return {
        repositoryFullName: repoFullName,
        contentMarkdown: sanitizeMarkdown(decoded),
        contentSha: res.sha,
        sourceUrl: res.html_url || sourceUrl,
        lastSyncedAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    // REST API fallback
  }

  // 2. Fallback to raw.githubusercontent.com
  const branches = ["HEAD", "main", "master"];
  const fileNames = ["README.md", "readme.md", "README.MD"];

  for (const branch of branches) {
    for (const fileName of fileNames) {
      try {
        const rawRes = await fetch(
          `https://raw.githubusercontent.com/${cleanOwner}/${cleanRepo}/${branch}/${fileName}`,
          {
            headers: { "User-Agent": "RateFactor-App" },
            next: { revalidate: 300 },
          }
        );
        if (rawRes.ok) {
          const text = await rawRes.text();
          if (text && text.length > 0) {
            return {
              repositoryFullName: repoFullName,
              contentMarkdown: sanitizeMarkdown(text),
              sourceUrl: `https://github.com/${owner}/${repo}/blob/${branch}/${fileName}`,
              lastSyncedAt: new Date().toISOString(),
            };
          }
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Saves and caches README in PostgreSQL.
 */
export async function saveGithubReadme(
  userId: string,
  data: GithubReadmeData
): Promise<void> {
  if (!userId || !data.contentMarkdown) return;

  try {
    await pool.query(
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
      await pool.query(
        `UPDATE public.profiles
         SET readme_markdown = $2, updated_at = NOW()
         WHERE id = $1`,
        [userId, data.contentMarkdown]
      );
    }
  } catch (err) {
    console.warn("[saveGithubReadme] DB cache error:", err);
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

  try {
    const res = await pool.query(
      `SELECT * FROM public.github_readmes
       WHERE user_id = $1 AND repository_full_name = $2
       LIMIT 1`,
      [userId, repositoryFullName]
    );

    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      repositoryFullName: r.repository_full_name,
      contentMarkdown: r.content_markdown,
      contentSha: r.content_sha || undefined,
      sourceUrl: r.source_url,
      lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at).toISOString() : undefined,
    };
  } catch {
    return null;
  }
}
