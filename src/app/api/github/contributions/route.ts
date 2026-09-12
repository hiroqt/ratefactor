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

    // 1. Fetch Profile
    const profile = await fetchGithubProfile(token, rawUsername).catch(() => ({
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
    }));

    if (userId) {
      await saveGithubProfile(userId, profile).catch(() => {});
    }

    // 2. Fetch Contributions
    const contributions = await fetchGithubContributions(token, rawUsername);
    if (userId && contributions.days.length > 0) {
      await saveGithubContributions(userId, contributions).catch(() => {});
    }

    // 3. Fetch Profile README ({username}/{username})
    let readmeMarkdown: string | undefined = undefined;
    try {
      const readme = await fetchGithubReadme(rawUsername, rawUsername, token);
      if (readme && readme.contentMarkdown) {
        readmeMarkdown = readme.contentMarkdown;
        if (userId) {
          await saveGithubReadme(userId, readme).catch(() => {});
        }
      }
    } catch {}

    return NextResponse.json({
      username: rawUsername,
      totalContributions: contributions.totalContributions,
      currentStreak: contributions.currentStreak,
      longestStreak: contributions.longestStreak,
      days: contributions.days,
      readmeMarkdown,
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
