import { githubFetch } from "./client";
import { githubCache, CACHE_TTL } from "./cache";

export interface GithubReadmeData { repositoryFullName: string; contentMarkdown: string; contentSha?: string; sourceUrl: string; lastSyncedAt?: string; }

// contentMarkdown is untrusted, raw Markdown — it is NOT sanitized here.
// Regex sanitization at this stage used to try (and fail) to strip dangerous
// markup before Markdown parsing, but a Markdown parser can pass raw HTML
// straight through, and encoded payloads only resolve to something dangerous
// after that parse. The real security boundary is sanitizeReadmeHtml, run on
// the HTML `marked.parse` produces, right before it reaches
// dangerouslySetInnerHTML (see src/components/dashboard/MarkdownRenderer.tsx).

export async function fetchGithubReadme(owner: string, repo: string, token?: string | null, bypassCache = false): Promise<GithubReadmeData | null> {
  const fullName = `${owner.trim()}/${repo.trim()}`;
  if (!owner.trim() || !repo.trim()) return null;
  const cacheKey = token ? null : `readme:${fullName.toLowerCase()}`;
  if (!bypassCache && cacheKey) { const cached = githubCache.get<GithubReadmeData>(cacheKey); if (cached) return cached; }
  try {
    const data: any = await githubFetch(token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`);
    if (!data?.content) return null;
    const result = { repositoryFullName: fullName, contentMarkdown: Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8"), contentSha: data.sha, sourceUrl: data.html_url || `https://github.com/${fullName}`, lastSyncedAt: new Date().toISOString() };
    if (cacheKey) githubCache.set(cacheKey, result, CACHE_TTL.README);
    return result;
  } catch {
    for (const branch of ["main", "master"]) {
      try {
        const response = await fetch(`https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${branch}/README.md`, { next: { revalidate: 600 } });
        if (response.ok) {
          const result = { repositoryFullName: fullName, contentMarkdown: await response.text(), sourceUrl: `https://github.com/${fullName}/blob/${branch}/README.md`, lastSyncedAt: new Date().toISOString() };
          if (cacheKey) githubCache.set(cacheKey, result, CACHE_TTL.README);
          return result;
        }
      } catch {}
    }
    return null;
  }
}
