import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { getGithubAccessToken, fetchGithubProfile, getCachedGithubProfile, saveGithubProfile } from "@/lib/github";
import { resolveCanonicalProfileId } from "@/lib/auth/profile-id";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryUsername = searchParams.get("username")?.trim().replace(/^@/, "");
    const user = await getSessionUser(req);

    // The Better Auth session id (used only to look up the linked GitHub
    // OAuth token) and the canonical public.profiles UUID (used for all
    // persistence/cache reads) are deliberately kept separate — see
    // src/lib/auth/profile-id.ts.
    const betterAuthUserId = user?.id;
    const canonicalProfileId = betterAuthUserId ? resolveCanonicalProfileId(betterAuthUserId) : undefined;

    if (!queryUsername && !betterAuthUserId) {
      return NextResponse.json(
        { error: "Username parameter or authenticated session is required" },
        { status: 400 }
      );
    }

    const isSelfLookup = !queryUsername && Boolean(betterAuthUserId);

    // 1. Check cache first for the caller's own linked profile
    if (isSelfLookup && canonicalProfileId) {
      const cached = await getCachedGithubProfile(canonicalProfileId);
      if (cached) {
        return NextResponse.json(cached, { status: 200 });
      }
    }

    // 2. Fetch fresh profile. A self lookup (no explicit username) with a
    // linked token resolves the actual authenticated GitHub identity via the
    // GitHub /user endpoint — it never assumes the RateFactor username is
    // also the GitHub login.
    const token = betterAuthUserId ? await getGithubAccessToken(betterAuthUserId) : null;
    const profile = await fetchGithubProfile(token, queryUsername || undefined);

    // Only persist when this is genuinely the caller's own linked account
    // (self lookup with a valid token) — never for a public username lookup.
    if (isSelfLookup && token && canonicalProfileId) {
      await saveGithubProfile(canonicalProfileId, profile).catch(() => {});
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch GitHub profile" },
      { status: 500 }
    );
  }
}
