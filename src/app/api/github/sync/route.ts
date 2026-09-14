import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { syncGithubUser } from "@/lib/github";
import { getGithubAccount } from "@/lib/github/client";

/**
 * Synchronizes the AUTHENTICATED caller's own linked GitHub account.
 *
 * Identity is derived entirely server-side: the RateFactor session names the
 * Better Auth user, and that user's linked GitHub OAuth token (if any) names
 * the actual GitHub account to sync. The request body's `username` is never
 * trusted as this caller's identity — a signed-in user cannot claim someone
 * else's public GitHub username as "their" synced account through this
 * endpoint. (Unauthenticated/public GitHub lookups are a separate concern,
 * served by the read-only /api/github/profile, /contributions, and
 * /repositories routes, which remain untouched by this restriction.)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to synchronize your GitHub account." },
        { status: 401 }
      );
    }

    const linkedAccount = await getGithubAccount(user.id);
    if (!linkedAccount?.accessToken) {
      return NextResponse.json(
        { error: "No linked GitHub account was found for your session. Connect GitHub first." },
        { status: 409 }
      );
    }

    const result = await syncGithubUser(user.id);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[POST /api/github/sync] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to synchronize GitHub data" },
      { status: 500 }
    );
  }
}
