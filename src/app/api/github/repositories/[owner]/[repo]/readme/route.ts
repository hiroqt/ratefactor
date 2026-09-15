import { NextRequest, NextResponse } from "next/server";
import { fetchGithubReadme, getGithubAccessToken } from "@/lib/github";
import { getSessionUser } from "@/lib/auth/server-session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  const user = await getSessionUser(req).catch(() => null);
  const token = user ? await getGithubAccessToken(user.id) : null;
  const readme = await fetchGithubReadme(owner, repo, token);
  return NextResponse.json(readme || { repositoryFullName: `${owner}/${repo}`, contentMarkdown: "" });
}
