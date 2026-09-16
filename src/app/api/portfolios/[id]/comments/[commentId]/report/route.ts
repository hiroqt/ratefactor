import { NextRequest, NextResponse } from "next/server";
import { commentReportSchema } from "@/lib/validations/portfolio";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/server-session";
import { pool } from "@/lib/auth/better-auth";
import { resolveCanonicalProfileId } from "@/lib/auth/profile-id";
import { invalidatePortfoliosCache } from "@/lib/dynamic-portfolios";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: portfolioId, commentId } = await params;
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const authUser = await getSessionUser(req);

    if (!authUser) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Sign in to report inappropriate comments for moderation.",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const actorId = authUser.id;
    // reporter_id is a UUID FK to profiles.id, not the raw Better Auth user id -
    // resolve it the same way every other mutation route does (likes, ratings).
    const canonicalActorProfileId = resolveCanonicalProfileId(actorId);

    // Rate limit reporting: max 5 reports per 10 minutes
    const rateCheck = checkRateLimit(`report:${actorId}:${ip}`, { limit: 5, windowSeconds: 600 });
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    const body = await req.json();
    const parseResult = commentReportSchema.safeParse({ ...body, commentId });
    if (!parseResult.success) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/validation-error",
          title: "Invalid Report Submission",
          status: 400,
          detail: "Please provide a valid report reason.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const reason = parseResult.data.reason;
    const details = parseResult.data.details || null;

    try {
      await pool.query(
        `INSERT INTO public.comment_reports (comment_id, reporter_id, reason, details)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (comment_id, reporter_id)
         DO UPDATE SET details = EXCLUDED.details, created_at = NOW()`,
        [commentId, canonicalActorProfileId, reason, details]
      );
    } catch (dbErr: any) {
      console.warn("[Comment Report] DB insert failed:", dbErr);
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/persistence-failed",
          title: "Report Not Persisted",
          status: 502,
          detail: "The report could not be saved right now. Please try again.",
        },
        { status: 502 }
      );
    }

    // The tr_sync_comment_reports trigger just bumped the comment's
    // report_count/is_reported/status, so the portfolio/feed cache must be
    // invalidated after a confirmed insert - never on a failed one.
    invalidatePortfoliosCache();

    return NextResponse.json({
      message: "Thank you. The comment has been flagged for platform moderator review.",
      commentId,
      status: "pending_review",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to process report.",
      },
      { status: 500 }
    );
  }
}
