import { NextRequest, NextResponse } from "next/server";
import { commentSubmissionSchema } from "@/lib/validations/portfolio";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { validateCommentContent } from "@/lib/guardrails";
import { getSessionUser } from "@/lib/auth/server-session";
import { portfolioComments } from "@/lib/comments-store";
import { pool } from "@/lib/auth/better-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: portfolioId } = await params;

    // 1. Attempt PostgreSQL database query
    try {
      const authUser = await getSessionUser(req).catch(() => null);
      let currentProfileId: string | null = null;
      if (authUser) {
        const pCheck = await pool.query(
          `SELECT id FROM public.profiles WHERE id::text = $1 OR LOWER(username) = LOWER($2) LIMIT 1`,
          [authUser.id, authUser.username || ""]
        );
        if (pCheck.rows[0]) currentProfileId = String(pCheck.rows[0].id);
      }

      const dbRes = await pool.query(
        `SELECT 
           c.id,
           c.portfolio_id as "portfolioId",
           c.user_id as "userId",
           c.content,
           c.critique_tag as "critiqueTag",
           c.created_at as "createdAt",
           c.is_reported as "isReported",
           c.status,
           COALESCE(pr.full_name, 'Developer') as "authorName",
           COALESCE(pr.username, 'dev') as "authorUsername",
           COALESCE(pr.avatar_url, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80') as "authorAvatar"
         FROM public.comments c
         LEFT JOIN public.profiles pr ON c.user_id = pr.id
         WHERE c.portfolio_id = $1 AND c.status = 'approved' AND c.is_reported = false
         ORDER BY c.created_at DESC`,
        [portfolioId]
      );
      if (dbRes.rows && dbRes.rows.length > 0) {
        const dbComments = dbRes.rows.map((r) => ({
          id: String(r.id),
          portfolioId: r.portfolioId,
          authorName: r.authorName,
          authorUsername: r.authorUsername,
          authorAvatar: r.authorAvatar,
          content: r.content,
          critiqueTag: r.critiqueTag || null,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          likes: 0,
          isUserOwner: Boolean(currentProfileId && String(r.userId) === currentProfileId),
          status: r.status,
          isReported: Boolean(r.isReported),
        }));
        return NextResponse.json(
          {
            portfolioId,
            comments: dbComments,
            total: dbComments.length,
          },
          {
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          }
        );
      }
    } catch {}

    // 2. In-memory comments fallback
    const comments = portfolioComments.get(portfolioId) || [];
    const approved = comments.filter((c) => !c.isReported && c.status !== "hidden");

    return NextResponse.json(
      {
        portfolioId,
        comments: approved,
        total: approved.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to fetch comments.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: portfolioId } = await params;
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const authUser = await getSessionUser(req);

    // Guardrail: Non-logged-in or unauthenticated users cannot post comments
    if (!authUser) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "You must be signed in with an active account to participate in discussions and post comments.",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const actorId = authUser.id;

    // Anti-Abuse Rate Limitation: Max 3 comments per minute, min 10s cooldown
    const rateCheck = checkRateLimit(`comment:${actorId}:${ip}`, "COMMENT");
    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck);
    }

    const body = await req.json();
    const parseResult = commentSubmissionSchema.safeParse({ ...body, portfolioId });

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      const isContentIssue = firstIssue?.path.includes("content");
      const guardrail = isContentIssue ? validateCommentContent((body.content || "").trim()) : null;
      return NextResponse.json(
        {
          type: isContentIssue
            ? "https://ratefactor.dev/errors/guardrail-violation"
            : "https://ratefactor.dev/errors/validation-error",
          title: isContentIssue ? "Comment Guardrail Violation" : "Invalid Comment Data",
          status: 400,
          detail: (guardrail && !guardrail.isValid ? guardrail.error : firstIssue?.message) || "Comment failed quality standards.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { content, critiqueTag } = parseResult.data;
    const commentUuid = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let newComment = {
      id: commentUuid,
      portfolioId,
      authorName: authUser.name || body.authorName || "Developer",
      authorUsername: authUser.username || body.authorUsername || "dev",
      authorAvatar: authUser.avatar || body.authorAvatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
      content,
      critiqueTag: critiqueTag || null,
      createdAt: new Date().toISOString(),
      likes: 0,
      isUserOwner: true,
      status: "approved",
      isReported: false,
    };

    let finalCommentsCount = 1;

    // Attempt PostgreSQL database persistence and exact count recalculation
    try {
      let actorProfileId: string | null = null;
      const profileCheck = await pool.query(
        `SELECT id, full_name, username, avatar_url FROM public.profiles 
         WHERE id::text = $1 OR LOWER(username) = LOWER($2) LIMIT 1`,
        [authUser.id, authUser.username || ""]
      );
      if (profileCheck.rows && profileCheck.rows.length > 0) {
        actorProfileId = profileCheck.rows[0].id;
        newComment.authorName = profileCheck.rows[0].full_name || newComment.authorName;
        newComment.authorUsername = profileCheck.rows[0].username || newComment.authorUsername;
        newComment.authorAvatar = profileCheck.rows[0].avatar_url || newComment.authorAvatar;
      }

      // Check portfolio details
      const portfolioCheck = await pool.query(
        `SELECT id, author_id, title FROM public.portfolios WHERE id = $1 LIMIT 1`,
        [portfolioId]
      );
      const portfolioRow = portfolioCheck.rows[0];

      if (actorProfileId) {
        const inserted = await pool.query(
          `INSERT INTO public.comments (
             id, portfolio_id, user_id, content, critique_tag, status, is_reported, created_at, updated_at
           ) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'approved', false, NOW(), NOW())
           RETURNING id, created_at`,
          [portfolioId, actorProfileId, content, critiqueTag || null]
        );

        if (inserted.rows && inserted.rows.length > 0) {
          newComment.id = String(inserted.rows[0].id);
          newComment.createdAt = new Date(inserted.rows[0].created_at).toISOString();
        }

        // Strictly recalculate exact comments count from database to prevent drift
        const countRes = await pool.query(
          `SELECT COUNT(*)::int as count FROM public.comments 
           WHERE portfolio_id = $1 AND status = 'approved' AND is_reported = false`,
          [portfolioId]
        );
        finalCommentsCount = countRes.rows[0]?.count ?? 1;

        await pool.query(
          `UPDATE public.portfolios SET comments_count = $1, updated_at = NOW() WHERE id = $2`,
          [finalCommentsCount, portfolioId]
        );

        // Dedicated notification for portfolio owner (excluding self-comment)
        if (
          portfolioRow &&
          portfolioRow.author_id &&
          String(portfolioRow.author_id) !== String(actorProfileId)
        ) {
          const previewText = content.length > 60 ? `${content.slice(0, 60)}...` : content;
          await pool.query(
            `INSERT INTO public.notifications (
              id, recipient_id, actor_id, portfolio_id, portfolio_title, type, message, is_read, created_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, $4, 'comment', $5, false, NOW()
            )`,
            [
              portfolioRow.author_id,
              actorProfileId,
              portfolioId,
              portfolioRow.title || "Portfolio",
              `commented: "${previewText}"`,
            ]
          );
        }
      }
    } catch (dbErr) {
      console.warn("[POST comments] Database persist notice:", dbErr);
    }

    let list = portfolioComments.get(portfolioId);
    if (!list) {
      list = [];
      portfolioComments.set(portfolioId, list);
    }
    list.unshift(newComment);

    return NextResponse.json(
      {
        message: "Comment successfully posted.",
        comment: newComment,
        commentsCount: finalCommentsCount,
        critiqueTag: newComment.critiqueTag,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        type: "https://ratefactor.dev/errors/internal",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "Failed to submit comment.",
      },
      { status: 500 }
    );
  }
}
