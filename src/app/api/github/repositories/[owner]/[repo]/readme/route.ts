import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { getGithubAccessToken, fetchGithubReadme, getCachedGithubReadme, saveGithubReadme } from "@/lib/github";
import { resolveCanonicalProfileId } from "@/lib/auth/profile-id";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await context.params;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Owner and repo path parameters are required" },
        { status: 400 }
      );
    }

    const user = await getSessionUser(req);
    const betterAuthUserId = user?.id;
    const canonicalProfileId = betterAuthUserId ? resolveCanonicalProfileId(betterAuthUserId) : undefined;
    const repoFullName = `${owner}/${repo}`;

    // 1. Check cache first if user is authenticated
    if (canonicalProfileId) {
      const cached = await getCachedGithubReadme(canonicalProfileId, repoFullName);
      if (cached) {
        return NextResponse.json(cached, { status: 200 });
      }
    }

    // 2. Fetch fresh README
    const token = betterAuthUserId ? await getGithubAccessToken(betterAuthUserId) : null;
    const readme = await fetchGithubReadme(owner, repo, token);

    if (!readme) {
      return NextResponse.json(
        { error: "No README found for this repository" },
        { status: 404 }
      );
    }

    if (canonicalProfileId) {
      await saveGithubReadme(canonicalProfileId, readme).catch(() => false);
    }

    return NextResponse.json(readme, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch repository README" },
      { status: 500 }
    );
  }
}
