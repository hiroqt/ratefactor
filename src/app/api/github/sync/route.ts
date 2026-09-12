import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { syncGithubUser } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const targetUsername = body?.username || user?.username;
    const userId = user?.id || `guest_${targetUsername || "dev"}`;

    if (!targetUsername && !user) {
      return NextResponse.json(
        { error: "Authentication or username parameter required to synchronize GitHub data" },
        { status: 400 }
      );
    }

    const result = await syncGithubUser(userId, targetUsername);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[POST /api/github/sync] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to synchronize GitHub data" },
      { status: 500 }
    );
  }
}
