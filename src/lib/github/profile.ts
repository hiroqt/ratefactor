import { pool } from "@/lib/auth/better-auth";
import { githubFetch } from "./client";
import { githubCache, CACHE_TTL } from "./cache";
import { safeDbQuery } from "./db";

export interface GithubProfileData {
  githubId: number;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  profileUrl: string;
  company: string;
  location: string;
  website: string;
  twitter: string;
  linkedin: string;
  publicRepositoryCount: number;
  followers: number;
  following: number;
  lastSyncedAt?: string;
}

/**
 * Fetches profile metadata from GitHub (REST API with HTML scraper fallback)
 * with in-memory cache support.
 */
export async function fetchGithubProfile(
  token?: string | null,
  fallbackUsername?: string,
  bypassCache = false
): Promise<GithubProfileData> {
  const targetUsername = (fallbackUsername || "").trim().replace(/^@/, "");
  // An authenticated self lookup (no target username) has no identity to key
  // a shared cache entry by other than the token itself — so it bypasses the
  // in-memory cache entirely rather than risk one user's data being served
  // from a generic "viewer" slot to another user. Explicit-username lookups
  // (public profiles) keep normal username-scoped caching.
  const cacheKey = token ? null : targetUsername ? `profile:${targetUsername.toLowerCase()}` : null;

  if (!bypassCache && cacheKey) {
    const cached = githubCache.get<GithubProfileData>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // 1. If target username is specified, fetch that specific user's profile
  if (targetUsername) {
    try {
      const u: any = await githubFetch(token || null, `/users/${encodeURIComponent(targetUsername)}`);
      if (u && u.id) {
        const profile: GithubProfileData = {
          githubId: u.id,
          username: u.login || targetUsername,
          displayName: u.name || targetUsername,
          bio: u.bio || "",
          avatarUrl: u.avatar_url || `https://github.com/${targetUsername}.png`,
          profileUrl: u.html_url || `https://github.com/${targetUsername}`,
          company: u.company || "",
          location: u.location || "",
          website: u.blog || "",
          twitter: u.twitter_username ? `https://twitter.com/${u.twitter_username}` : "",
          linkedin: "",
          publicRepositoryCount: u.public_repos || 0,
          followers: u.followers || 0,
          following: u.following || 0,
          lastSyncedAt: new Date().toISOString(),
        };

        if (cacheKey) githubCache.set(cacheKey, profile, CACHE_TTL.PROFILE);
        return profile;
      }
    } catch {}
  } else if (token) {
    // 2. If no target username is specified, query authenticated /user endpoint
    try {
      const u: any = await githubFetch(token, "/user");
      if (u && u.id) {
        let twitter = u.twitter_username ? `https://twitter.com/${u.twitter_username}` : "";
        let linkedin = "";

        // Check social accounts API
        try {
          const socials: any[] = await githubFetch(token, "/user/social_accounts");
          if (Array.isArray(socials)) {
            for (const s of socials) {
              if (s.url?.includes("twitter.com") || s.url?.includes("x.com")) twitter = s.url;
              if (s.url?.includes("linkedin.com")) linkedin = s.url;
            }
          }
        } catch {}

        const profile: GithubProfileData = {
          githubId: u.id,
          username: u.login,
          displayName: u.name || u.login,
          bio: u.bio || "",
          avatarUrl: u.avatar_url || `https://github.com/${u.login}.png`,
          profileUrl: u.html_url || `https://github.com/${u.login}`,
          company: u.company || "",
          location: u.location || "",
          website: u.blog || "",
          twitter,
          linkedin,
          publicRepositoryCount: u.public_repos || 0,
          followers: u.followers || 0,
          following: u.following || 0,
          lastSyncedAt: new Date().toISOString(),
        };

        // Cache under the resolved real username only — never under a
        // shared "viewer" slot, since that would leak this user's profile
        // to the next authenticated caller with no explicit username.
        if (!token && profile.username) {
          githubCache.set(`profile:${profile.username.toLowerCase()}`, profile, CACHE_TTL.PROFILE);
        }
        return profile;
      }
      throw new Error("GitHub did not return a valid authenticated user.");
    } catch (err) {
      // An authenticated self lookup has no username to fall back to
      // scraping/caching a placeholder for — propagate the failure so the
      // caller (syncGithubUser) can keep existing data instead of silently
      // returning fabricated zeros as if the sync succeeded.
      throw err instanceof Error ? err : new Error("Failed to fetch authenticated GitHub profile.");
    }
  }

  // 3. Fallback to HTML Scraping (bypasses GitHub unauthenticated IP rate-limits)
  if (targetUsername) {
    try {
      const htmlRes = await fetch(`https://github.com/${encodeURIComponent(targetUsername)}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        next: { revalidate: 300 },
      });

      if (htmlRes.ok) {
        const html = await htmlRes.text();

        // Extract Name
        const nameMatch =
          /<span[^>]*itemprop="name"[^>]*>\s*([^<]+?)\s*<\/span>/i.exec(html) ||
          /<h1[^>]*vcard-names[^>]*>[\s\S]*?<span[^>]*p-name[^>]*>\s*([^<]+?)\s*<\/span>/i.exec(html);
        const displayName = nameMatch ? nameMatch[1].trim() : targetUsername;

        // Extract Bio
        const bioMatch =
          /<div[^>]*data-bio-text[^>]*>\s*([\s\S]*?)\s*<\/div>/i.exec(html) ||
          /<div[^>]*class="[^"]*p-note[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/div>/i.exec(html) ||
          /<div[^>]*class="[^"]*user-profile-bio[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/div>/i.exec(html);

        let bio = "";
        if (bioMatch) {
          bio = bioMatch[1]
            .replace(/<[^>]*>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
        }

        // Extract Location
        const locMatch = /itemprop="homeLocation"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i.exec(html);
        const location = locMatch ? locMatch[1].trim() : "";

        // Extract Company
        const compMatch = /itemprop="worksFor"[^>]*>[\s\S]*?<div[^>]*>([^<]+)<\/div>/i.exec(html);
        const company = compMatch ? compMatch[1].trim() : "";

        // Extract Website
        const blogMatch = /itemprop="url"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i.exec(html);
        const website = blogMatch ? blogMatch[1].trim() : "";

        // Extract Twitter
        const twitterMatch = /itemprop="twitter"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/i.exec(html);
        const twitter = twitterMatch ? twitterMatch[1].trim() : "";

        // Extract Public Repo count
        const repoCountMatch = /href="\/[^"]+\?tab=repositories"[^>]*>[\s\S]*?<span[^>]*class="Counter[^"]*"[^>]*>([0-9,]+)<\/span>/i.exec(html);
        const publicRepositoryCount = repoCountMatch ? parseInt(repoCountMatch[1].replace(/,/g, ""), 10) || 0 : 0;

        // Extract Followers
        const followersMatch = /href="\/[^"]+\?tab=followers"[^>]*>[\s\S]*?<span[^>]*class="Counter[^"]*"[^>]*>([0-9,]+)<\/span>/i.exec(html);
        const followers = followersMatch ? parseInt(followersMatch[1].replace(/,/g, ""), 10) || 0 : 0;

        // Extract Following
        const followingMatch = /href="\/[^"]+\?tab=following"[^>]*>[\s\S]*?<span[^>]*class="Counter[^"]*"[^>]*>([0-9,]+)<\/span>/i.exec(html);
        const following = followingMatch ? parseInt(followingMatch[1].replace(/,/g, ""), 10) || 0 : 0;

        const profile: GithubProfileData = {
          githubId: 0,
          username: targetUsername,
          displayName: displayName || targetUsername,
          bio,
          avatarUrl: `https://github.com/${targetUsername}.png`,
          profileUrl: `https://github.com/${targetUsername}`,
          company,
          location,
          website,
          twitter,
          linkedin: "",
          publicRepositoryCount,
          followers,
          following,
          lastSyncedAt: new Date().toISOString(),
        };

        if (cacheKey) githubCache.set(cacheKey, profile, CACHE_TTL.PROFILE);
        return profile;
      }
    } catch {}
  }

  const fallbackProfile: GithubProfileData = {
    githubId: 0,
    username: targetUsername || "developer",
    displayName: targetUsername || "developer",
    bio: "",
    avatarUrl: targetUsername ? `https://github.com/${targetUsername}.png` : "/placeholder.svg",
    profileUrl: targetUsername ? `https://github.com/${targetUsername}` : "https://github.com",
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

  if (cacheKey) githubCache.set(cacheKey, fallbackProfile, CACHE_TTL.PROFILE);
  return fallbackProfile;
}

/**
 * Saves and caches GitHub profile in PostgreSQL safely.
 * `userId` must be the canonical public.profiles UUID (see
 * resolveCanonicalProfileId in src/lib/auth/profile-id.ts) — this table's
 * user_id column is a foreign key to public.profiles(id), not the Better
 * Auth TEXT user id.
 *
 * Returns whether the primary github_profiles write actually succeeded, so
 * callers can distinguish a real persistence failure from success instead of
 * assuming success just because fresh GitHub data was fetched.
 */
export async function saveGithubProfile(
  userId: string,
  profile: GithubProfileData
): Promise<boolean> {
  if (!userId || !profile.username) return false;

  const primary = await safeDbQuery(
    `INSERT INTO public.github_profiles (
      user_id, github_id, username, display_name, bio, avatar_url, profile_url,
      public_repository_count, followers, following, last_synced_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      github_id = EXCLUDED.github_id,
      username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      profile_url = EXCLUDED.profile_url,
      public_repository_count = EXCLUDED.public_repository_count,
      followers = EXCLUDED.followers,
      following = EXCLUDED.following,
      last_synced_at = NOW(),
      updated_at = NOW()`,
    [
      userId,
      profile.githubId,
      profile.username,
      profile.displayName,
      profile.bio,
      profile.avatarUrl,
      profile.profileUrl,
      profile.publicRepositoryCount,
      profile.followers,
      profile.following,
    ]
  );

  // Sync to profiles table. Best-effort enrichment: its failure doesn't make
  // the overall save a failure, since the primary github_profiles cache row
  // above is what the dashboard actually reads back after a refresh.
  await safeDbQuery(
    `UPDATE public.profiles
     SET
       bio = COALESCE(NULLIF($2, ''), bio),
       company = COALESCE(NULLIF($3, ''), company),
       location = COALESCE(NULLIF($4, ''), location),
       website = COALESCE(NULLIF($5, ''), website),
       twitter = COALESCE(NULLIF($6, ''), twitter),
       linkedin = COALESCE(NULLIF($7, ''), linkedin),
       github = COALESCE(NULLIF($8, ''), github),
       updated_at = NOW()
     WHERE id = $1`,
    [
      userId,
      profile.bio,
      profile.company,
      profile.location,
      profile.website,
      profile.twitter,
      profile.linkedin,
      profile.profileUrl,
    ]
  );

  return primary !== null;
}

/**
 * Retrieves cached GitHub profile from PostgreSQL.
 */
export async function getCachedGithubProfile(userId: string): Promise<GithubProfileData | null> {
  if (!userId) return null;

  const res = await safeDbQuery(
    `SELECT * FROM public.github_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  if (!res || !res.rows || res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    githubId: Number(r.github_id),
    username: r.username,
    displayName: r.display_name || r.username,
    bio: r.bio || "",
    avatarUrl: r.avatar_url || `https://github.com/${r.username}.png`,
    profileUrl: r.profile_url || `https://github.com/${r.username}`,
    company: "",
    location: "",
    website: "",
    twitter: "",
    linkedin: "",
    publicRepositoryCount: r.public_repository_count || 0,
    followers: r.followers || 0,
    following: r.following || 0,
    lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at).toISOString() : undefined,
  };
}
