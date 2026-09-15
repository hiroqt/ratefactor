import { githubFetch } from "./client";
import { githubCache, CACHE_TTL } from "./cache";

export interface GithubProfileData {
  githubId: number; username: string; displayName: string; bio: string; avatarUrl: string; profileUrl: string;
  company: string; location: string; website: string; twitter: string; linkedin: string;
  publicRepositoryCount: number; followers: number; following: number; lastSyncedAt?: string;
}

export async function fetchGithubProfile(token?: string | null, fallbackUsername?: string, bypassCache = false): Promise<GithubProfileData> {
  const username = (fallbackUsername || "").trim().replace(/^@/, "");
  const cacheKey = token ? null : username ? `profile:${username.toLowerCase()}` : null;
  if (!bypassCache && cacheKey) {
    const cached = githubCache.get<GithubProfileData>(cacheKey);
    if (cached) return cached;
  }
  let user: any;
  try {
    user = await githubFetch(token, username ? `/users/${encodeURIComponent(username)}` : "/user");
  } catch (error) {
    if (!username) throw error;
    try {
      const response = await fetch(`https://github.com/${encodeURIComponent(username)}`, { next: { revalidate: 300 } });
      const html = response.ok ? await response.text() : "";
      const name = /itemprop="name"[^>]*>\s*([^<]+)/i.exec(html)?.[1]?.trim() || username;
      const bio = /data-bio-text[^>]*>\s*([\s\S]*?)\s*<\/div>/i.exec(html)?.[1]?.replace(/<[^>]*>/g, "").trim() || "";
      return { githubId: 0, username, displayName: name, bio, avatarUrl: `https://github.com/${username}.png`, profileUrl: `https://github.com/${username}`, company: "", location: "", website: "", twitter: "", linkedin: "", publicRepositoryCount: 0, followers: 0, following: 0, lastSyncedAt: new Date().toISOString() };
    } catch {
      return { githubId: 0, username, displayName: username, bio: "", avatarUrl: `https://github.com/${username}.png`, profileUrl: `https://github.com/${username}`, company: "", location: "", website: "", twitter: "", linkedin: "", publicRepositoryCount: 0, followers: 0, following: 0, lastSyncedAt: new Date().toISOString() };
    }
  }
  if (!user?.login) throw new Error("GitHub did not return a valid profile.");
  let twitter = user.twitter_username ? `https://twitter.com/${user.twitter_username}` : "";
  let linkedin = "";
  if (token && !username) {
    const socialAccounts = await githubFetch<any[]>(token, "/user/social_accounts").catch((): any[] => []);
    for (const account of socialAccounts) {
      if (account.url?.includes("twitter.com") || account.url?.includes("x.com")) twitter = account.url;
      if (account.url?.includes("linkedin.com")) linkedin = account.url;
    }
  }
  const result: GithubProfileData = {
    githubId: user.id || 0, username: user.login, displayName: user.name || user.login, bio: user.bio || "",
    avatarUrl: user.avatar_url || `https://github.com/${user.login}.png`, profileUrl: user.html_url || `https://github.com/${user.login}`,
    company: user.company || "", location: user.location || "", website: user.blog || "",
    twitter, linkedin,
    publicRepositoryCount: user.public_repos || 0, followers: user.followers || 0, following: user.following || 0,
    lastSyncedAt: new Date().toISOString(),
  };
  if (cacheKey) githubCache.set(cacheKey, result, CACHE_TTL.PROFILE);
  return result;
}
