import { pool } from "@/lib/auth/better-auth";
import { githubFetch } from "./client";

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
 * Fetches profile metadata from GitHub (REST API with HTML scraper fallback).
 */
export async function fetchGithubProfile(
  token?: string | null,
  fallbackUsername?: string
): Promise<GithubProfileData> {
  const targetUsername = (fallbackUsername || "").trim().replace(/^@/, "");

  // 1. Try Authenticated /user endpoint if token is present
  if (token) {
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

        return {
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
      }
    } catch (err) {
      console.warn("[fetchGithubProfile] Authenticated /user failed, falling back:", err);
    }
  }

  // 2. Try Public REST /users/{username} if username is available
  if (targetUsername) {
    try {
      const u: any = await githubFetch(null, `/users/${encodeURIComponent(targetUsername)}`);
      if (u && u.id) {
        return {
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
      }
    } catch {}

    // 3. Fallback to HTML Scraping (bypasses GitHub unauthenticated IP rate-limits)
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

        const nameMatch =
          html.match(/class="[^"]*p-name[^"]*"[^>]*>([^<]+)<\/span>/i) ||
          html.match(/itemprop="name"[^>]*>([^<]+)<\/span>/i) ||
          html.match(/class="[^"]*vcard-fullname[^"]*"[^>]*>([^<]+)<\/span>/i);
        const displayName = nameMatch ? nameMatch[1].trim() : targetUsername;

        const bioMatch = html.match(
          /class="[^"]*user-profile-bio[^"]*"[^>]*>(?:<div[^>]*>)?([\s\S]*?)(?:<\/div>)?<\/div>/i
        );
        const bio = bioMatch ? bioMatch[1].replace(/<[^>]+>/g, "").trim() : "";

        const companyMatch = html.match(
          /itemprop="worksFor"[^>]*>[\s\S]*?<span[^>]*class="p-org"[^>]*>([\s\S]*?)<\/span>/i
        );
        const company = companyMatch ? companyMatch[1].replace(/<[^>]+>/g, "").trim() : "";

        const locMatch = html.match(
          /itemprop="homeLocation"[^>]*>[\s\S]*?<span[^>]*class="p-label"[^>]*>([\s\S]*?)<\/span>/i
        );
        const location = locMatch ? locMatch[1].replace(/<[^>]+>/g, "").trim() : "";

        const linkMatch =
          html.match(/itemprop="url"[^>]*>[\s\S]*?<a[^>]*class="Link--primary"[^>]*href="([^"]+)"/i) ||
          html.match(/itemprop="url"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/i);
        const website = linkMatch ? linkMatch[1].trim() : "";

        const twitterMatch =
          html.match(/itemprop="twitter"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/i) ||
          html.match(/href="(https:\/\/(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+)"/i);
        const twitter = twitterMatch ? twitterMatch[1].trim() : "";

        const linkedinMatch = html.match(/href="(https:\/\/[a-z.]*linkedin\.com\/[^"]+)"/i);
        const linkedin = linkedinMatch ? linkedinMatch[1].trim() : "";

        const reposMatch = html.match(
          /href="\/[^"]+\?tab=repositories"[^>]*>[\s\S]*?<span[^>]*class="Counter[^"]*"[^>]*>([^<]+)<\/span>/i
        );
        const publicRepositoryCount = reposMatch ? parseInt(reposMatch[1].trim(), 10) || 0 : 0;

        const followersMatch = html.match(
          /href="\/[^"]+\?tab=followers"[^>]*>[\s\S]*?<span[^>]*class="text-bold[^"]*"[^>]*>([^<]+)<\/span>/i
        );
        const followers = followersMatch ? parseInt(followersMatch[1].trim(), 10) || 0 : 0;

        return {
          githubId: targetUsername.split("").reduce((acc, c) => acc + c.charCodeAt(0), 100000),
          username: targetUsername,
          displayName,
          bio,
          avatarUrl: `https://github.com/${targetUsername}.png`,
          profileUrl: `https://github.com/${targetUsername}`,
          company,
          location,
          website,
          twitter,
          linkedin,
          publicRepositoryCount,
          followers,
          following: 0,
          lastSyncedAt: new Date().toISOString(),
        };
      }
    } catch {}
  }

  throw new Error("Unable to retrieve GitHub profile. Please ensure GitHub handle is valid or re-authenticate.");
}

/**
 * Saves and caches GitHub profile in PostgreSQL.
 */
export async function saveGithubProfile(
  userId: string,
  profile: GithubProfileData
): Promise<void> {
  if (!userId) return;

  try {
    await pool.query(
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

    // Sync to profiles table
    await pool.query(
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
  } catch (err) {
    console.warn("[saveGithubProfile] DB cache error:", err);
  }
}

/**
 * Retrieves cached GitHub profile from PostgreSQL.
 */
export async function getCachedGithubProfile(userId: string): Promise<GithubProfileData | null> {
  if (!userId) return null;

  try {
    const res = await pool.query(
      `SELECT * FROM public.github_profiles WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (res.rows.length === 0) return null;
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
  } catch {
    return null;
  }
}
