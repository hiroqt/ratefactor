import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { verifyGithubProjectRelationship } from "@/lib/github/repository-verification";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

/**
 * Lightweight PREVIEW of project-level GitHub verification for the
 * submission modal. Uses the same shared verification function as the
 * authoritative check that runs inside POST /api/portfolios — this endpoint
 * never persists anything and its result must never be trusted as final by
 * the publish flow; the publish route re-derives verification itself.
 *
 * Identity and linkage are resolved entirely server-side (session cookie ->
 * Better Auth user -> linked GitHub token); the request body's only input is
 * the candidate URL to check.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { status: null, reason: "not_linked" },
        { status: 401 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateCheck = checkRateLimit(`github-verify-preview:${user.id}:${ip}`, "GITHUB_VERIFY_PREVIEW");
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    const body = await req.json().catch(() => null);
    const githubUrl = typeof body?.githubUrl === "string" ? body.githubUrl : "";

    const result = await verifyGithubProjectRelationship(user.id, githubUrl);

    if (result.status === null) {
      return NextResponse.json({ status: null, reason: result.reason }, { status: 200 });
    }

    // Only the fields the UI actually needs — never the OAuth token or any
    // other account internals.
    return NextResponse.json(
      { status: result.status, repositoryFullName: result.repositoryFullName },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[POST /api/github/verify-project] Error:", error);
    return NextResponse.json({ status: null, reason: "unavailable" }, { status: 200 });
  }
}
