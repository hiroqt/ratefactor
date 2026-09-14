import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import {
  getGithubAccessToken,
  fetchGithubProfile,
  fetchGithubContributions,
  fetchGithubReadme,
  saveGithubProfile,
  saveGithubContributions,
  saveGithubReadme,
  getCachedGithubContributions,
} from "@/lib/github";
import { resolveCanonicalProfileId } from "@/lib/auth/profile-id";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queryUsername = searchParams.get("username")?.trim().replace(/^@/, "");
  const force = searchParams.get("force") === "true";

  const user = await getSessionUser(req).catch(() => null);
  const betterAuthUserId = user?.id;
  const canonicalProfileId = betterAuthUserId ? resolveCanonicalProfileId(betterAuthUserId) : undefined;
  const isSelfLookup = !queryUsername && Boolean(betterAuthUserId);

  if (!queryUsername && !isSelfLookup) {
    return NextResponse.json(
      { error: "Username parameter or authenticated session is required" },
      { status: 400 }
    );
  }

  try {
    // Cache-first for the caller's own linked account (fast path for
    // dashboard hydration after a refresh).
    if (isSelfLookup && canonicalProfileId && !force) {
      const cached = await getCachedGithubContributions(canonicalProfileId);
      if (cached) {
        return NextResponse.json({
          username: cached.username,
          totalContributions: cached.totalContributions,
          currentStreak: cached.currentStreak,
          longestStreak: cached.longestStreak,
          days: cached.days,
          syncedAt: cached.lastSyncedAt
            ? new Date(cached.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Cached",
        }, { status: 200 });
      }
    }

    const token = betterAuthUserId ? await getGithubAccessToken(betterAuthUserId).catch(() => null) : null;
    // A self lookup (no explicit username) with a linked token resolves the
    // actual authenticated GitHub identity — it never assumes the RateFactor
    // username is also the GitHub login.
    const rawUsername = queryUsername || undefined;

    // Concurrently fetch profile, contributions, and README for blazing speed
    const [profile, contributions, readme] = await Promise.all([
      fetchGithubProfile(token, rawUsername, force).catch(() => ({
        githubId: 0,
        username: rawUsername || "developer",
        displayName: rawUsername || "developer",
        bio: "",
        avatarUrl: rawUsername ? `https://github.com/${rawUsername}.png` : "/placeholder.svg",
        profileUrl: rawUsername ? `https://github.com/${rawUsername}` : "https://github.com",
        company: "",
        location: "",
        website: "",
        twitter: "",
        linkedin: "",
        publicRepositoryCount: 0,
        followers: 0,
        following: 0,
      })),
      fetchGithubContributions(token, rawUsername, force),
      rawUsername ? fetchGithubReadme(rawUsername, rawUsername, token, force).catch(() => null) : Promise.resolve(null),
    ]);

    const resolvedUsername = profile.username || rawUsername || "developer";

    // Only persist when this is genuinely the caller's own linked account.
    if (isSelfLookup && token && canonicalProfileId) {
      Promise.all([
        saveGithubProfile(canonicalProfileId, profile).catch(() => false),
        contributions.days.length > 0 ? saveGithubContributions(canonicalProfileId, contributions).catch(() => false) : Promise.resolve(true),
        readme?.contentMarkdown ? saveGithubReadme(canonicalProfileId, readme).catch(() => false) : Promise.resolve(true),
      ]).catch(() => {});
    }

    const response = NextResponse.json({
      username: resolvedUsername,
      totalContributions: contributions.totalContributions,
      currentStreak: contributions.currentStreak,
      longestStreak: contributions.longestStreak,
      days: contributions.days,
      readmeMarkdown: readme?.contentMarkdown || undefined,
      profile: {
        name: profile.displayName || resolvedUsername,
        bio: profile.bio || "",
        avatar: profile.avatarUrl || `https://github.com/${resolvedUsername}.png`,
        company: profile.company || "",
        location: profile.location || "",
        website: profile.website || "",
        twitter: profile.twitter || "",
        linkedin: profile.linkedin || "",
        publicRepos: profile.publicRepositoryCount || 0,
        followers: profile.followers || 0,
        profileUrl: profile.profileUrl || `https://github.com/${resolvedUsername}`,
      },
      syncedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    // Cache-Control headers for browser and CDN edge cache
    response.headers.set(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=600"
    );

    return response;
  } catch (error: any) {
    const fallbackUsername = queryUsername || "developer";
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch GitHub contributions",
        username: fallbackUsername,
        days: [],
        totalContributions: 0,
        currentStreak: 0,
        longestStreak: 0,
        profile: {
          name: fallbackUsername,
          bio: "",
          avatar: `https://github.com/${fallbackUsername}.png`,
          company: "",
          location: "",
          website: "",
          twitter: "",
          linkedin: "",
          publicRepos: 0,
          followers: 0,
          profileUrl: `https://github.com/${fallbackUsername}`,
        },
      },
      { status: 200 }
    );
  }
}
