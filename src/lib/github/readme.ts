import { githubFetch } from "./client";
import { githubCache, CACHE_TTL } from "./cache";

export interface GithubReadmeData { repositoryFullName: string; contentMarkdown: string; contentSha?: string; sourceUrl: string; lastSyncedAt?: string; }

export function sanitizeReadmeMarkdown(raw: string) {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/<meta\b[^>]*\/?>/gi, "")
    .replace(/<base\b[^>]*\/?>/gi, "")
    .replace(/<link\b[^>]*\/?>/gi, "")
    .replace(/<\/?form\b[^>]*>/gi, "")
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(?:href|src|action|xlink:href)\s*=\s*["']?\s*(?:javascript|vbscript):[^"'>]+/gi, 'href="#"');
}

export async function fetchGithubReadme(owner: string, repo: string, token?: string | null, bypassCache = false): Promise<GithubReadmeData | null> {
  const fullName = `${owner.trim()}/${repo.trim()}`;
  if (!owner.trim() || !repo.trim()) return null;
  const cacheKey = token ? null : `readme:${fullName.toLowerCase()}`;
  if (!bypassCache && cacheKey) { const cached = githubCache.get<GithubReadmeData>(cacheKey); if (cached) return cached; }
  try {
    const data: any = await githubFetch(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`);
    if (!data?.content) return null;
    const result = { repositoryFullName: fullName, contentMarkdown: sanitizeReadmeMarkdown(Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8")), contentSha: data.sha, sourceUrl: data.html_url || `https://github.com/${fullName}`, lastSyncedAt: new Date().toISOString() };
    if (cacheKey) githubCache.set(cacheKey, result, CACHE_TTL.README);
    return result;
  } catch {
    for (const branch of ["main", "master"]) {
      try {
        const response = await fetch(`https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${branch}/README.md`, { next: { revalidate: 600 } });
        if (response.ok) {
          const result = { repositoryFullName: fullName, contentMarkdown: sanitizeReadmeMarkdown(await response.text()), sourceUrl: `https://github.com/${fullName}/blob/${branch}/README.md`, lastSyncedAt: new Date().toISOString() };
          if (cacheKey) githubCache.set(cacheKey, result, CACHE_TTL.README);
          return result;
        }
      } catch {}
    }
    return null;
  }
}
