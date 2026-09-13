import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { getGithubAccessToken, fetchGithubProfile, getCachedGithubProfile, saveGithubProfile } from "@/lib/github";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryUsername = searchParams.get("username")?.trim().replace(/^@/, "");
    const user = await getSessionUser(req);

    const userId = user?.id;
    const targetUsername = queryUsername || user?.username;

    if (!targetUsername && !userId) {
      return NextResponse.json(
        { error: "Username parameter or authenticated session is required" },
        { status: 400 }
      );
    }

    // 1. Check cache first if userId is present
    if (userId) {
      const cached = await getCachedGithubProfile(userId);
      if (cached && !queryUsername) {
        return NextResponse.json(cached, { status: 200 });
      }
    }

    // 2. Fetch fresh profile
    const token = userId ? await getGithubAccessToken(userId) : null;
    const profile = await fetchGithubProfile(token, queryUsername || (token ? undefined : targetUsername));

    // Only persist to the user's profile if fetching self
    if (userId && (!queryUsername || queryUsername.toLowerCase() === user?.username?.toLowerCase())) {
      await saveGithubProfile(userId, profile).catch(() => {});
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch GitHub profile" },
      { status: 500 }
    );
  }
}
