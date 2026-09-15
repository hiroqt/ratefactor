import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/server-session";
import { pool } from "@/lib/auth/better-auth";
import { resolveCanonicalProfileId } from "@/lib/auth/profile-id";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: portfolioId } = await params;
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const authUser = await getSessionUser(req);

    if (!authUser) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "You must be signed in with an active account to delete a portfolio.",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const rateCheck = checkRateLimit(`delete-portfolio:${authUser.id}:${ip}`, {
      limit: 10,
      windowSeconds: 60,
      debounceSeconds: 1,
    });
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    const canonicalActorProfileId = resolveCanonicalProfileId(authUser.id);

    let portfolioCheck;
    try {
      portfolioCheck = await pool.query(
        `SELECT author_id FROM public.portfolios WHERE id = $1 LIMIT 1`,
        [portfolioId]
      );
    } catch (dbErr) {
      console.warn("[DELETE portfolio] Database lookup error:", dbErr);
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/internal",
          title: "Internal Server Error",
          status: 500,
          detail: "Failed to look up the portfolio. Please try again.",
        },
        { status: 500 }
      );
    }

    const dbAuthorId = portfolioCheck.rows[0]?.author_id ? String(portfolioCheck.rows[0].author_id) : null;
    if (!dbAuthorId) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/not-found",
          title: "Not Found",
          status: 404,
          detail: "Portfolio not found.",
        },
        { status: 404 }
      );
    }

    if (dbAuthorId !== canonicalActorProfileId) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "You can only delete your own portfolio.",
        },
        { status: 403 }
      );
    }

    try {
      // ON DELETE CASCADE on ratings/likes/comments/notifications/showcases
      // handles all dependent rows — no manual child-table cleanup needed.
      await pool.query(`DELETE FROM public.portfolios WHERE id = $1`, [portfolioId]);
    } catch (dbErr) {
      console.warn("[DELETE portfolio] Database delete error:", dbErr);
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/persistence-failed",
          title: "Delete Not Persisted",
          status: 502,
          detail: "The portfolio could not be deleted right now. Please try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: "Portfolio deleted.", portfolioId });
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to delete portfolio.",
      },
      { status: 500 }
    );
  }
}
