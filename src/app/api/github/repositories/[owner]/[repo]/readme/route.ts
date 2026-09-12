import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { getGithubAccessToken, fetchGithubReadme, getCachedGithubReadme, saveGithubReadme } from "@/lib/github";

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
    const userId = user?.id;
    const repoFullName = `${owner}/${repo}`;

    // 1. Check cache first if user is authenticated
    if (userId) {
      const cached = await getCachedGithubReadme(userId, repoFullName);
      if (cached) {
        return NextResponse.json(cached, { status: 200 });
      }
    }

    // 2. Fetch fresh README
    const token = userId ? await getGithubAccessToken(userId) : null;
    const readme = await fetchGithubReadme(owner, repo, token);

    if (!readme) {
      return NextResponse.json(
        { error: "No README found for this repository" },
        { status: 404 }
      );
    }

    if (userId) {
      await saveGithubReadme(userId, readme).catch(() => {});
    }

    return NextResponse.json(readme, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch repository README" },
      { status: 500 }
    );
  }
}
