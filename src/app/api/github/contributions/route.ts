import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { 
  getGithubAccessToken, 
  fetchGithubProfile, 
  fetchGithubContributions, 
  fetchGithubReadme,
  saveGithubProfile,
  saveGithubContributions,
  saveGithubReadme
} from "@/lib/github";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUsername = searchParams.get("username")?.trim().replace(/^@/, "");
  const force = searchParams.get("force") === "true";

  if (!rawUsername) {
    return NextResponse.json(
      { error: "Username parameter is required" },
      { status: 400 }
    );
  }

  const user = await getSessionUser(req).catch(() => null);
  const userId = user?.id;

  try {
    const token = userId ? await getGithubAccessToken(userId).catch(() => null) : null;

    // Concurrently fetch profile, contributions, and README for blazing speed
    const [profile, contributions, readme] = await Promise.all([
      fetchGithubProfile(token, rawUsername, force).catch(() => ({
        githubId: 0,
        username: rawUsername,
        displayName: rawUsername,
        bio: "",
        avatarUrl: `https://github.com/${rawUsername}.png`,
        profileUrl: `https://github.com/${rawUsername}`,
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
      fetchGithubReadme(rawUsername, rawUsername, token, force).catch(() => null),
    ]);

    // Save in database concurrently in background
    if (userId) {
      Promise.all([
        saveGithubProfile(userId, profile).catch(() => {}),
        contributions.days.length > 0 ? saveGithubContributions(userId, contributions).catch(() => {}) : Promise.resolve(),
        readme?.contentMarkdown ? saveGithubReadme(userId, readme).catch(() => {}) : Promise.resolve(),
      ]).catch(() => {});
    }

    const response = NextResponse.json({
      username: rawUsername,
      totalContributions: contributions.totalContributions,
      currentStreak: contributions.currentStreak,
      longestStreak: contributions.longestStreak,
      days: contributions.days,
      readmeMarkdown: readme?.contentMarkdown || undefined,
      profile: {
        name: profile.displayName || rawUsername,
        bio: profile.bio || "",
        avatar: profile.avatarUrl || `https://github.com/${rawUsername}.png`,
        company: profile.company || "",
        location: profile.location || "",
        website: profile.website || "",
        twitter: profile.twitter || "",
        linkedin: profile.linkedin || "",
        publicRepos: profile.publicRepositoryCount || 0,
        followers: profile.followers || 0,
        profileUrl: profile.profileUrl || `https://github.com/${rawUsername}`,
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
    return NextResponse.json(
      {
        error: error?.message || "Failed to fetch GitHub contributions",
        username: rawUsername,
        days: [],
        totalContributions: 0,
        currentStreak: 0,
        longestStreak: 0,
        profile: {
          name: rawUsername,
          bio: "",
          avatar: `https://github.com/${rawUsername}.png`,
          company: "",
          location: "",
          website: "",
          twitter: "",
          linkedin: "",
          publicRepos: 0,
          followers: 0,
          profileUrl: `https://github.com/${rawUsername}`,
        },
      },
      { status: 200 }
    );
  }
}
