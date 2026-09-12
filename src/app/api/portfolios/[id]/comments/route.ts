import { NextRequest, NextResponse } from "next/server";
import { commentSubmissionSchema } from "@/lib/validations/portfolio";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { validateCommentContent } from "@/lib/guardrails";
import { INITIAL_PORTFOLIOS } from "@/data/mockPortfolios";
import { getSessionUser } from "@/lib/auth/server-session";

// In-memory comments store initialized from mock portfolios
const portfolioComments = new Map<string, any[]>();

INITIAL_PORTFOLIOS.forEach((p) => {
  portfolioComments.set(p.id, [...p.comments]);
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: portfolioId } = await params;
    const comments = portfolioComments.get(portfolioId) || [];

    // Only return approved comments to public guests
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
    const content = (body.content || "").trim();

    // Strict Guardrail Quality Check
    const guardrailCheck = validateCommentContent(content);
    if (!guardrailCheck.isValid) {
      return NextResponse.json(
        {
          type: "https://ratefactor.dev/errors/guardrail-violation",
          title: "Comment Guardrail Violation",
          status: 400,
          detail: guardrailCheck.error || "Comment failed community quality standards.",
        },
        { status: 400 }
      );
    }

    const newComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      portfolioId,
      authorName: body.authorName || authUser.name || "Architect",
      authorUsername: body.authorUsername || authUser.username || "arneldev",
      authorAvatar: body.authorAvatar || authUser.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
      content,
      createdAt: new Date().toISOString(),
      likes: 0,
      isUserOwner: true,
      status: "approved",
      isReported: false,
    };

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
