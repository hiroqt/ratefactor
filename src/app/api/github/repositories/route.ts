import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { getGithubAccessToken, fetchGithubRepositories, getCachedGithubRepositories, saveGithubRepositories } from "@/lib/github";

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
      const cached = await getCachedGithubRepositories(userId);
      if (cached && cached.length > 0 && !queryUsername) {
        return NextResponse.json({ repositories: cached }, { status: 200 });
      }
    }

    // 2. Fetch fresh repositories
    const token = userId ? await getGithubAccessToken(userId) : null;
    const repositories = await fetchGithubRepositories(token, targetUsername);

    if (userId && repositories.length > 0) {
      await saveGithubRepositories(userId, repositories).catch(() => {});
    }

    return NextResponse.json({ repositories }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch GitHub repositories", repositories: [] },
      { status: 200 }
    );
  }
}
