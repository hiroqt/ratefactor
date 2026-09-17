import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { portfolioComments, commentAuthorProfileIds } from "@/lib/comments-store";
import { pool } from "@/lib/auth/better-auth";
import { resolveCanonicalProfileId } from "@/lib/auth/profile-id";
import { isCommentDeletionAuthorized } from "@/lib/auth/comment-authorization";
import { invalidatePortfoliosCache } from "@/lib/dynamic-portfolios";

export async function DELETE(
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
          detail: "You must be signed in to delete comments.",
          requiresAuth: true,
        },
        {
          status: 401,
          headers: { "Content-Type": "application/problem+json" },
        }
      );
    }

    const rateCheck = checkRateLimit(`delete_comment:${authUser.id}:${ip}`, {
      limit: 15,
      windowSeconds: 60,
      debounceSeconds: 1,
    });
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    let isAuthorized = false;
    const isStaff = authUser.role === "moderator" || authUser.role === "admin";
    const actorProfileId = resolveCanonicalProfileId(authUser.id);
    let dbFound = false;

    // Check PostgreSQL database first
    try {
      const dbCheck = await pool.query(
        `SELECT c.id, c.user_id
         FROM public.comments c
         WHERE c.id::text = $1 AND c.portfolio_id = $2
         LIMIT 1`,
        [commentId, portfolioId]
      );

      if (dbCheck.rows && dbCheck.rows.length > 0) {
        dbFound = true;
        const row = dbCheck.rows[0];

        if (
          isCommentDeletionAuthorized({
            actorProfileId,
            commentAuthorProfileId: String(row.user_id),
            isStaff,
          })
        ) {
          isAuthorized = true;
        }
      }
    } catch {}

    const comments = portfolioComments.get(portfolioId);
    const commentIndex = comments ? comments.findIndex((c) => c.id === commentId) : -1;

    if (!dbFound && commentIndex === -1) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/not-found",
          title: "Comment Not Found",
          status: 404,
          detail: `Comment with ID ${commentId} was not found on this portfolio.`,
        },
        {
          status: 404,
          headers: { "Content-Type": "application/problem+json" },
        }
      );
    }

    if (!isAuthorized && commentIndex !== -1) {
      if (
        isCommentDeletionAuthorized({
          actorProfileId,
          commentAuthorProfileId: commentAuthorProfileIds.get(commentId),
          isStaff,
        })
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "You do not have permission to delete this comment.",
        },
        {
          status: 403,
          headers: { "Content-Type": "application/problem+json" },
        }
      );
    }

    // Remove from in-memory cache if present
    if (comments && commentIndex !== -1) {
      comments.splice(commentIndex, 1);
      commentAuthorProfileIds.delete(commentId);
    }

    let finalCommentsCount = comments ? comments.length : 0;

    // Remove from PostgreSQL and recount exact approved comments
    try {
      await pool.query(
        `DELETE FROM public.comments WHERE id::text = $1 AND portfolio_id = $2`,
        [commentId, portfolioId]
      );

      const countRes = await pool.query(
        `SELECT COUNT(*)::int as count FROM public.comments 
         WHERE portfolio_id = $1 AND status = 'approved' AND is_reported = false`,
        [portfolioId]
      );
      finalCommentsCount = countRes.rows[0]?.count ?? finalCommentsCount;

      await pool.query(
        `UPDATE public.portfolios SET comments_count = $1, updated_at = NOW() WHERE id = $2`,
        [finalCommentsCount, portfolioId]
      );
    } catch (err) {
      console.warn("[DELETE comment] Database cleanup error:", err);
    }

    invalidatePortfoliosCache();

    return NextResponse.json(
      {
        message: "Comment successfully deleted.",
        portfolioId,
        commentId,
        commentsCount: finalCommentsCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to delete comment.",
      },
      {
        status: 500,
        headers: { "Content-Type": "application/problem+json" },
      }
    );
  }
}
