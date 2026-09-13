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
      const dbRes = await pool.query(
        `SELECT 
           c.id,
           c.portfolio_id as "portfolioId",
           c.content,
           c.critique_tag as "critiqueTag",
           c.created_at as "createdAt",
           c.is_reported as "isReported",
           c.status,
           pr.full_name as "authorName",
           pr.username as "authorUsername",
           pr.avatar_url as "authorAvatar"
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
          authorName: r.authorName || "Developer",
          authorUsername: r.authorUsername || "dev",
          authorAvatar: r.authorAvatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
          content: r.content,
          critiqueTag: r.critiqueTag || null,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          likes: 0,
          isUserOwner: false,
          status: r.status,
          isReported: Boolean(r.isReported),
        }));
        return NextResponse.json({
          portfolioId,
          comments: dbComments,
          total: dbComments.length,
        });
      }
    } catch {}

    // 2. In-memory comments fallback
    const comments = portfolioComments.get(portfolioId) || [];
    const approved = comments.filter((c) => !c.isReported && c.status !== "hidden");

    return NextResponse.json({
      portfolioId,
      comments: approved,
      total: approved.length,
    });
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

    const newComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

    // Attempt PostgreSQL database persistence
    try {
      let authorProfileId: string | null = null;
      const profileCheck = await pool.query(
        `SELECT id FROM public.profiles WHERE id = $1 OR LOWER(username) = LOWER($2) LIMIT 1`,
        [authUser.id, authUser.username || ""]
      );
      if (profileCheck.rows && profileCheck.rows.length > 0) {
        authorProfileId = profileCheck.rows[0].id;
      }

      if (authorProfileId) {
        await pool.query(
          `INSERT INTO public.comments (id, portfolio_id, user_id, content, critique_tag, status)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'approved')`,
          [portfolioId, authorProfileId, content, critiqueTag || null]
        );
        await pool.query(
          `UPDATE public.portfolios SET comments_count = comments_count + 1 WHERE id = $1`,
          [portfolioId]
        );
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
