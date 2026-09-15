import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { fetchGithubRepositories, getGithubAccessToken } from "@/lib/github";

export async function GET(req: NextRequest) {
  try {
    const username = new URL(req.url).searchParams.get("username")?.trim().replace(/^@/, "");
    const user = await getSessionUser(req);
    if (!username && !user) return NextResponse.json({ error: "Username parameter or authenticated session is required" }, { status: 400 });
    const token = user ? await getGithubAccessToken(user.id) : null;
    const repositories = await fetchGithubRepositories(token, username || undefined);
    return NextResponse.json({ repositories: username ? repositories.filter((repo) => !repo.isPrivate) : repositories });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch GitHub repositories", repositories: [] }, { status: 200 });
  }
}
