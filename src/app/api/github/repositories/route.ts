import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { getGithubAccessToken, fetchGithubRepositories, getCachedGithubRepositories, saveGithubRepositories } from "@/lib/github";
import { resolveCanonicalProfileId } from "@/lib/auth/profile-id";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryUsername = searchParams.get("username")?.trim().replace(/^@/, "");
    const user = await getSessionUser(req);

    const betterAuthUserId = user?.id;
    const canonicalProfileId = betterAuthUserId ? resolveCanonicalProfileId(betterAuthUserId) : undefined;
    const isSelf = !queryUsername && Boolean(betterAuthUserId);

    if (!queryUsername && !isSelf) {
      return NextResponse.json(
        { error: "Username parameter or authenticated session is required" },
        { status: 400 }
      );
    }

    // 1. Check cache first for the caller's own linked account
    if (isSelf && canonicalProfileId) {
      const cached = await getCachedGithubRepositories(canonicalProfileId);
      if (cached && cached.length > 0) {
        return NextResponse.json({ repositories: cached }, { status: 200 });
      }
    }

    // 2. Fetch fresh repositories. A self lookup (no explicit username) with
    // a linked token resolves the caller's own repositories directly — it
    // never assumes the RateFactor username is also the GitHub login.
    const token = betterAuthUserId ? await getGithubAccessToken(betterAuthUserId) : null;
    const repositories = await fetchGithubRepositories(token, queryUsername || undefined);

    if (isSelf && canonicalProfileId && repositories.length > 0) {
      await saveGithubRepositories(canonicalProfileId, repositories).catch(() => false);
    }

    // Never leak private repositories to third-party viewers
    const publicSafeRepos = isSelf ? repositories : repositories.filter((r) => !r.isPrivate);

    return NextResponse.json({ repositories: publicSafeRepos }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch GitHub repositories", repositories: [] },
      { status: 200 }
    );
  }
}
