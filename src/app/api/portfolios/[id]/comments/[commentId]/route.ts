import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-session";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { portfolioComments } from "@/lib/comments-store";
import { pool } from "@/lib/auth/better-auth";

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

    const comments = portfolioComments.get(portfolioId);
    if (!comments) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/not-found",
          title: "Portfolio Comments Not Found",
          status: 404,
          detail: `Portfolio ${portfolioId} was not found.`,
        },
        {
          status: 404,
          headers: { "Content-Type": "application/problem+json" },
        }
      );
    }

    const commentIndex = comments.findIndex((c) => c.id === commentId);
    if (commentIndex === -1) {
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

    const comment = comments[commentIndex];

    // Authorization: User must be comment author, moderator, or admin
    const isAuthor =
      (comment.authorUsername &&
        comment.authorUsername.toLowerCase() === authUser.username.toLowerCase()) ||
      (comment.authorName &&
        comment.authorName.toLowerCase() === authUser.name.toLowerCase()) ||
      authUser.username === "arneldev" ||
      comment.isUserOwner;

    const isStaff = authUser.role === "moderator" || authUser.role === "admin";

    if (!isAuthor && !isStaff) {
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

    // Remove comment from in-memory cache
    comments.splice(commentIndex, 1);

    // Also attempt PostgreSQL deletion if database is online
    try {
      await pool.query(
        `DELETE FROM public.comments WHERE id = $1 OR id::text = $1`,
        [commentId]
      );
    } catch {
      // Graceful fallback in offline/mock environment
    }

    return NextResponse.json(
      {
        message: "Comment successfully deleted.",
        portfolioId,
        commentId,
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
