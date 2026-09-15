import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { fetchGithubContributions, fetchGithubProfile, fetchGithubReadme, getGithubAccessToken } from "@/lib/github";

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const requestedUsername = params.get("username")?.trim().replace(/^@/, "");
  const force = params.get("force") === "true";
  const user = await getSessionUser(req).catch(() => null);
  if (!requestedUsername && !user) return NextResponse.json({ error: "Username parameter or authenticated session is required" }, { status: 400 });
  try {
    const token = user ? await getGithubAccessToken(user.id) : null;
    const profile = await fetchGithubProfile(token, requestedUsername || undefined, force);
    const username = profile.username || requestedUsername || "developer";
    const [contributions, readme] = await Promise.all([
      fetchGithubContributions(token, username, force),
      fetchGithubReadme(username, username, token, force).catch(() => null),
    ]);
    const response = NextResponse.json({
      username, totalContributions: contributions.totalContributions, currentStreak: contributions.currentStreak,
      longestStreak: contributions.longestStreak, days: contributions.days, readmeMarkdown: readme?.contentMarkdown,
      profile: { name: profile.displayName || username, bio: profile.bio || "", avatar: profile.avatarUrl,
        company: profile.company || "", location: profile.location || "", website: profile.website || "", twitter: profile.twitter || "",
        linkedin: profile.linkedin || "", publicRepos: profile.publicRepositoryCount || 0, followers: profile.followers || 0, profileUrl: profile.profileUrl },
      syncedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    response.headers.set("Cache-Control", requestedUsername ? "public, max-age=300, stale-while-revalidate=600" : "private, no-store");
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch GitHub contributions", username: requestedUsername || "developer", days: [], totalContributions: 0, currentStreak: 0, longestStreak: 0 }, { status: 200 });
  }
}
