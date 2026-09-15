import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { fetchGithubProfile, getGithubAccessToken } from "@/lib/github";

export async function GET(req: NextRequest) {
  try {
    const username = new URL(req.url).searchParams.get("username")?.trim().replace(/^@/, "");
    const user = await getSessionUser(req);
    if (!username && !user) return NextResponse.json({ error: "Username parameter or authenticated session is required" }, { status: 400 });
    const token = user ? await getGithubAccessToken(user.id) : null;
    return NextResponse.json(await fetchGithubProfile(token, username || undefined));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch GitHub profile" }, { status: 500 });
  }
}
